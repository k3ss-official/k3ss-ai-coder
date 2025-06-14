import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { 
  Activity, 
  Brain, 
  Terminal, 
  Globe, 
  Shield, 
  Zap, 
  CheckCircle, 
  AlertCircle,
  Play,
  Settings,
  Code,
  Search
} from 'lucide-react'
import './App.css'

function App() {
  const [systemStatus, setSystemStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [chatMessage, setChatMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    // Fetch system status from integration gateway
    const fetchStatus = async () => {
      try {
        const response = await fetch('http://localhost:9000/health')
        const data = await response.json()
        setSystemStatus(data)
      } catch (error) {
        console.error('Failed to fetch system status:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStatus()
    // Refresh status every 30 seconds
    const interval = setInterval(fetchStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  const services = [
    {
      id: 'ai_orchestration',
      name: 'AI Orchestration',
      description: 'Multi-provider AI integration with intelligent routing',
      icon: Brain,
      port: 8080,
      color: 'bg-blue-500'
    },
    {
      id: 'cli_automation',
      name: 'CLI Automation',
      description: 'Command-line tools and workflow automation',
      icon: Terminal,
      port: 8081,
      color: 'bg-green-500'
    },
    {
      id: 'browser_control',
      name: 'Browser Control',
      description: 'Web automation and research capabilities',
      icon: Globe,
      port: 8082,
      color: 'bg-purple-500'
    },
    {
      id: 'security',
      name: 'Security Framework',
      description: 'Enterprise-grade security and compliance',
      icon: Shield,
      port: 8083,
      color: 'bg-red-500'
    }
  ]

  const getServiceStatus = (serviceId) => {
    if (!systemStatus?.integration?.system_health?.services) return 'unknown'
    return systemStatus.integration.system_health.services[serviceId]?.status || 'unknown'
  }

  const handleChatSubmit = async (e) => {
    e.preventDefault()
    if (!chatMessage.trim()) return

    try {
      const response = await fetch('http://localhost:9000/ai/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: chatMessage,
          type: 'chat'
        })
      })
      
      if (response.ok) {
        console.log('Chat message sent successfully')
        setChatMessage('')
      }
    } catch (error) {
      console.error('Failed to send chat message:', error)
    }
  }

  const handleWebSearch = async (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    try {
      const response = await fetch('http://localhost:9000/browser/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery
        })
      })
      
      if (response.ok) {
        console.log('Search executed successfully')
        setSearchQuery('')
      }
    } catch (error) {
      console.error('Failed to execute search:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <Activity className="h-12 w-12 text-blue-500 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white">Loading K3SS AI Coder...</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">K3SS AI Coder</h1>
                <p className="text-sm text-slate-400">Ultimate AI Code Assistant</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant={systemStatus?.integration?.system_health?.system_status === 'healthy' ? 'default' : 'destructive'}>
                {systemStatus?.integration?.system_health?.system_status || 'Unknown'}
              </Badge>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-slate-800">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="chat">AI Chat</TabsTrigger>
            <TabsTrigger value="tools">Tools</TabsTrigger>
            <TabsTrigger value="research">Research</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {/* System Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-400">Total Services</CardTitle>
                  <div className="text-2xl font-bold text-white">
                    {systemStatus?.integration?.services_integrated || 0}
                  </div>
                </CardHeader>
              </Card>
              
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-400">Online Services</CardTitle>
                  <div className="text-2xl font-bold text-green-400">
                    {systemStatus?.integration?.system_health?.online_services || 0}
                  </div>
                </CardHeader>
              </Card>

              <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-400">System Status</CardTitle>
                  <div className="text-2xl font-bold text-blue-400">
                    {systemStatus?.integration?.system_health?.system_status || 'Unknown'}
                  </div>
                </CardHeader>
              </Card>

              <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-400">Version</CardTitle>
                  <div className="text-2xl font-bold text-purple-400">
                    {systemStatus?.version || '1.0.0'}
                  </div>
                </CardHeader>
              </Card>
            </div>

            {/* Services Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {services.map((service) => {
                const status = getServiceStatus(service.id)
                const Icon = service.icon
                
                return (
                  <Card key={service.id} className="bg-slate-800 border-slate-700">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`h-10 w-10 ${service.color} rounded-lg flex items-center justify-center`}>
                            <Icon className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-white">{service.name}</CardTitle>
                            <CardDescription className="text-slate-400">
                              Port {service.port}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {status === 'online' ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-red-500" />
                          )}
                          <Badge variant={status === 'online' ? 'default' : 'destructive'}>
                            {status}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-slate-400 mb-4">{service.description}</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        disabled={status !== 'online'}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Test Service
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>

          <TabsContent value="chat" className="space-y-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Brain className="h-5 w-5" />
                  <span>AI Assistant</span>
                </CardTitle>
                <CardDescription>
                  Chat with the AI assistant for code help, analysis, and generation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="h-64 bg-slate-900 rounded-lg p-4 overflow-y-auto">
                  <p className="text-slate-400 text-sm">
                    AI Assistant is ready. Start a conversation...
                  </p>
                </div>
                <form onSubmit={handleChatSubmit} className="flex space-x-2">
                  <Input
                    placeholder="Ask the AI assistant anything..."
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    className="flex-1 bg-slate-900 border-slate-600"
                  />
                  <Button type="submit" disabled={!chatMessage.trim()}>
                    Send
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tools" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Code className="h-5 w-5" />
                    <span>Code Generation</span>
                  </CardTitle>
                  <CardDescription>
                    Generate code, components, and project scaffolding
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder="Describe what you want to generate..."
                    className="bg-slate-900 border-slate-600"
                  />
                  <Button className="w-full">
                    Generate Code
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Terminal className="h-5 w-5" />
                    <span>CLI Commands</span>
                  </CardTitle>
                  <CardDescription>
                    Execute CLI commands and automation workflows
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    placeholder="Enter CLI command..."
                    className="bg-slate-900 border-slate-600"
                  />
                  <Button className="w-full">
                    Execute Command
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="research" className="space-y-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Search className="h-5 w-5" />
                  <span>Web Research</span>
                </CardTitle>
                <CardDescription>
                  Search the web and analyze content for development insights
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={handleWebSearch} className="flex space-x-2">
                  <Input
                    placeholder="Search for documentation, tutorials, or solutions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-slate-900 border-slate-600"
                  />
                  <Button type="submit" disabled={!searchQuery.trim()}>
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </Button>
                </form>
                <div className="h-64 bg-slate-900 rounded-lg p-4 overflow-y-auto">
                  <p className="text-slate-400 text-sm">
                    Search results will appear here...
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default App

