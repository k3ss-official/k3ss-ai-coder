"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HuggingFaceProvider = void 0;
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const base_1 = require("../providers/base");
class HuggingFaceProvider extends base_1.BaseAIProvider {
    constructor(config) {
        super('huggingface', 'local', config);
        this.isModelLoaded = false;
        this.config = config;
        this.pythonScriptPath = path_1.default.join(__dirname, 'hf_bridge.py');
        this.initializePythonBridge();
        this.loadModels();
    }
    async isAvailable() {
        try {
            // Check if Python is available
            const pythonPath = this.config.pythonPath || 'python3';
            return new Promise((resolve) => {
                const process = (0, child_process_1.spawn)(pythonPath, ['-c', 'import transformers; print("OK")']);
                let output = '';
                process.stdout?.on('data', (data) => {
                    output += data.toString();
                });
                process.on('close', (code) => {
                    resolve(code === 0 && output.includes('OK'));
                });
                process.on('error', () => {
                    resolve(false);
                });
            });
        }
        catch (error) {
            console.error('Hugging Face Transformers not available:', error);
            return false;
        }
    }
    async loadModels() {
        if (!this.config.modelName) {
            this.models = [];
            return;
        }
        try {
            const modelInfo = await this.getModelInfo(this.config.modelName);
            if (modelInfo) {
                this.models = [this.mapHuggingFaceModel(modelInfo)];
            }
        }
        catch (error) {
            console.error('Error loading Hugging Face model:', error);
            this.models = [];
        }
    }
    async sendRequest(request) {
        this.validateRequest(request);
        if (this.models.length === 0) {
            throw this.createError('NO_MODEL', 'No Hugging Face models available');
        }
        const startTime = Date.now();
        const model = this.models[0];
        try {
            const prompt = this.buildPrompt(request);
            const response = await this.executeModel(prompt, request);
            const responseTime = Date.now() - startTime;
            const tokensUsed = this.estimateTokens(prompt + response);
            return this.createResponse(request.id, response, model.id, tokensUsed, responseTime);
        }
        catch (error) {
            throw this.createError('REQUEST_FAILED', `Hugging Face request failed: ${error.message}`, true);
        }
    }
    getCapabilities() {
        return {
            maxConcurrentRequests: 2, // Limited by GPU memory
            supportedModels: this.models.map(m => m.id),
            features: ['local_execution', 'no_api_key', 'privacy', 'gpu_acceleration', 'quantization'],
            rateLimits: []
        };
    }
    async loadModel(modelName) {
        try {
            this.config.modelName = modelName;
            await this.loadModels();
            // Load the model in Python
            const result = await this.executePythonScript('load_model', {
                model_name: modelName,
                device: this.config.device || 'cpu',
                quantization: this.config.quantization || 'none'
            });
            this.isModelLoaded = result.success;
            return this.isModelLoaded;
        }
        catch (error) {
            console.error('Error loading Hugging Face model:', error);
            return false;
        }
    }
    async unloadModel() {
        try {
            await this.executePythonScript('unload_model', {});
            this.isModelLoaded = false;
            return true;
        }
        catch (error) {
            console.error('Error unloading Hugging Face model:', error);
            return false;
        }
    }
    async executeModel(prompt, request) {
        if (!this.isModelLoaded) {
            await this.loadModel(this.config.modelName);
        }
        const result = await this.executePythonScript('generate', {
            prompt,
            max_length: request.options?.maxTokens || 512,
            temperature: request.options?.temperature || 0.7,
            top_p: request.options?.topP || 1,
            do_sample: true,
            pad_token_id: 50256 // Common pad token
        });
        if (!result.success) {
            throw new Error(result.error || 'Generation failed');
        }
        return result.response;
    }
    async executePythonScript(action, params) {
        return new Promise((resolve, reject) => {
            const pythonPath = this.config.pythonPath || 'python3';
            const args = [this.pythonScriptPath, action, JSON.stringify(params)];
            const process = (0, child_process_1.spawn)(pythonPath, args);
            let output = '';
            let errorOutput = '';
            process.stdout?.on('data', (data) => {
                output += data.toString();
            });
            process.stderr?.on('data', (data) => {
                errorOutput += data.toString();
            });
            process.on('close', (code) => {
                if (code === 0) {
                    try {
                        const result = JSON.parse(output);
                        resolve(result);
                    }
                    catch (error) {
                        reject(new Error(`Failed to parse Python output: ${output}`));
                    }
                }
                else {
                    reject(new Error(`Python script failed: ${errorOutput}`));
                }
            });
            process.on('error', (error) => {
                reject(error);
            });
        });
    }
    async getModelInfo(modelName) {
        try {
            const result = await this.executePythonScript('get_model_info', {
                model_name: modelName
            });
            if (result.success) {
                return result.info;
            }
            return null;
        }
        catch (error) {
            console.error('Error getting model info:', error);
            return null;
        }
    }
    mapHuggingFaceModel(modelInfo) {
        const isCodeModel = this.isCodeModel(modelInfo.name);
        return {
            id: modelInfo.name,
            name: modelInfo.name,
            provider: 'huggingface',
            type: 'chat',
            capabilities: {
                languages: isCodeModel ? modelInfo.languages : ['text'],
                tasks: isCodeModel ? modelInfo.tasks : ['general_chat'],
                maxTokens: 2048,
                supportsStreaming: false, // HF Transformers doesn't support streaming by default
                supportsImages: false,
                supportsCode: isCodeModel
            },
            contextWindow: modelInfo.contextLength,
            performance: {
                averageResponseTime: 10000, // HF models can be slower
                reliability: 0.92,
                accuracy: this.getModelAccuracy(modelInfo.name),
                throughput: 10
            }
        };
    }
    async initializePythonBridge() {
        // Create the Python bridge script
        const pythonScript = `
import sys
import json
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline
import warnings
warnings.filterwarnings("ignore")

class HuggingFaceBridge:
    def __init__(self):
        self.model = None
        self.tokenizer = None
        self.pipeline = None
        
    def load_model(self, params):
        try:
            model_name = params['model_name']
            device = params.get('device', 'cpu')
            quantization = params.get('quantization', 'none')
            
            # Load tokenizer
            self.tokenizer = AutoTokenizer.from_pretrained(model_name)
            if self.tokenizer.pad_token is None:
                self.tokenizer.pad_token = self.tokenizer.eos_token
            
            # Load model with quantization if specified
            if quantization == '4bit':
                from transformers import BitsAndBytesConfig
                quantization_config = BitsAndBytesConfig(load_in_4bit=True)
                self.model = AutoModelForCausalLM.from_pretrained(
                    model_name, 
                    quantization_config=quantization_config,
                    device_map="auto"
                )
            elif quantization == '8bit':
                self.model = AutoModelForCausalLM.from_pretrained(
                    model_name, 
                    load_in_8bit=True,
                    device_map="auto"
                )
            else:
                self.model = AutoModelForCausalLM.from_pretrained(model_name)
                if device != 'cpu' and torch.cuda.is_available():
                    self.model = self.model.to(device)
            
            # Create pipeline
            self.pipeline = pipeline(
                "text-generation",
                model=self.model,
                tokenizer=self.tokenizer,
                device=0 if device == 'cuda' and torch.cuda.is_available() else -1
            )
            
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def unload_model(self, params):
        try:
            if self.model is not None:
                del self.model
                del self.tokenizer
                del self.pipeline
                torch.cuda.empty_cache() if torch.cuda.is_available() else None
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def generate(self, params):
        try:
            if self.pipeline is None:
                return {"success": False, "error": "Model not loaded"}
            
            prompt = params['prompt']
            max_length = params.get('max_length', 512)
            temperature = params.get('temperature', 0.7)
            top_p = params.get('top_p', 1.0)
            do_sample = params.get('do_sample', True)
            
            # Generate response
            outputs = self.pipeline(
                prompt,
                max_length=max_length,
                temperature=temperature,
                top_p=top_p,
                do_sample=do_sample,
                return_full_text=False,
                pad_token_id=self.tokenizer.pad_token_id
            )
            
            response = outputs[0]['generated_text']
            return {"success": True, "response": response}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def get_model_info(self, params):
        try:
            model_name = params['model_name']
            
            # Basic model info (this could be enhanced with actual model inspection)
            info = {
                "name": model_name,
                "type": "causal_lm",
                "size": "unknown",
                "languages": ["javascript", "typescript", "python", "java", "cpp", "csharp", "go", "rust"],
                "tasks": ["code_generation", "code_explanation", "general_chat"],
                "contextLength": 2048
            }
            
            return {"success": True, "info": info}
        except Exception as e:
            return {"success": False, "error": str(e)}

if __name__ == "__main__":
    bridge = HuggingFaceBridge()
    
    if len(sys.argv) != 3:
        print(json.dumps({"success": False, "error": "Invalid arguments"}))
        sys.exit(1)
    
    action = sys.argv[1]
    params = json.loads(sys.argv[2])
    
    if hasattr(bridge, action):
        result = getattr(bridge, action)(params)
        print(json.dumps(result))
    else:
        print(json.dumps({"success": False, "error": f"Unknown action: {action}"}))
`;
        try {
            await fs_1.promises.writeFile(this.pythonScriptPath, pythonScript);
        }
        catch (error) {
            console.error('Error creating Python bridge script:', error);
        }
    }
    buildPrompt(request) {
        let prompt = '';
        // Add system instruction
        const systemInstruction = this.getSystemInstruction(request.type);
        if (systemInstruction) {
            prompt += `### System\n${systemInstruction}\n\n`;
        }
        // Add context if available
        if (request.context && request.context.files.length > 0) {
            const contextContent = this.buildContextContent(request.context);
            if (contextContent) {
                prompt += `### Context\n${contextContent}\n\n`;
            }
        }
        // Add main user request
        prompt += `### Human\n${request.content}\n\n### Assistant\n`;
        return prompt;
    }
    getSystemInstruction(type) {
        const instructions = {
            'code_generation': 'You are an expert software developer. Generate clean, efficient code.',
            'code_explanation': 'You are an expert code reviewer. Explain code clearly.',
            'code_refactoring': 'You are an expert software architect. Refactor code to improve quality.',
            'bug_fixing': 'You are an expert debugger. Identify and fix bugs.',
            'documentation': 'You are a technical writer. Create clear documentation.',
            'testing': 'You are a QA engineer. Write comprehensive tests.',
            'optimization': 'You are a performance engineer. Optimize code.',
            'general_chat': 'You are a helpful AI assistant for software development.'
        };
        return instructions[type] || instructions['general_chat'];
    }
    buildContextContent(context) {
        let content = '';
        if (context.currentFile) {
            content += `Current file: ${context.currentFile}\n`;
        }
        if (context.selection) {
            content += `Selected code:\n${context.selection.text}\n`;
        }
        if (context.files && context.files.length > 0) {
            content += '\nRelevant files:\n';
            context.files.slice(0, 2).forEach((file) => {
                content += `${file.path}: ${file.content?.substring(0, 400) || 'No content'}\n`;
            });
        }
        return content;
    }
    isCodeModel(modelName) {
        const codeModels = ['code', 'codellama', 'starcoder', 'deepseek-coder', 'wizardcoder', 'phind-codellama'];
        return codeModels.some(name => modelName.toLowerCase().includes(name));
    }
    getModelAccuracy(modelName) {
        if (modelName.includes('70b'))
            return 0.89;
        if (modelName.includes('34b'))
            return 0.85;
        if (modelName.includes('13b'))
            return 0.82;
        if (modelName.includes('7b'))
            return 0.79;
        return 0.77;
    }
    estimateTokens(text) {
        return Math.ceil(text.length / 4);
    }
}
exports.HuggingFaceProvider = HuggingFaceProvider;
//# sourceMappingURL=huggingface.js.map