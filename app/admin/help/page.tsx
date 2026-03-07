// app/admin/help/page.tsx
'use client'

import { useState } from 'react'
import { 
  HelpCircle, Book, Video, FileText, MessageCircle, 
  Mail, ExternalLink, Search, ChevronRight, Package,
  ChefHat, Building, BarChart, Download, Settings,
  Shield, Users, Zap, CheckCircle
} from 'lucide-react'

import { Container } from '../../components/layout/Container'
import { Card } from '../../components/layout/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'

export default function HelpPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')

  const categories = [
    { id: 'all', name: 'All Topics', icon: Book },
    { id: 'getting-started', name: 'Getting Started', icon: Zap },
    { id: 'ingredients', name: 'Ingredients', icon: Package },
    { id: 'menu', name: 'Menu Builder', icon: ChefHat },
    { id: 'sites', name: 'Sites & Kiosks', icon: Building },
    { id: 'compliance', name: 'Compliance', icon: Shield },
    { id: 'downloads', name: 'Reports & Downloads', icon: Download }
  ]

  const helpTopics = [
    {
      id: 1,
      category: 'getting-started',
      title: 'Getting Started with AllyJen',
      description: 'Learn the basics of setting up and using the AllyJen allergen management platform',
      icon: Zap,
      color: 'purple'
    },
    {
      id: 2,
      category: 'getting-started',
      title: 'Platform Overview',
      description: 'Understand the main features and how to navigate the admin dashboard',
      icon: Book,
      color: 'blue'
    },
    {
      id: 3,
      category: 'ingredients',
      title: 'Adding New Ingredients',
      description: 'How to create ingredient records with allergen information and datasheets',
      icon: Package,
      color: 'green'
    },
    {
      id: 4,
      category: 'ingredients',
      title: 'Managing Product Datasheets',
      description: 'Upload, view, and track product specification sheets and compliance documents',
      icon: FileText,
      color: 'orange'
    },
    {
      id: 5,
      category: 'ingredients',
      title: 'Supplier Management',
      description: 'Track multiple suppliers per ingredient and manage supplier information',
      icon: Users,
      color: 'indigo'
    },
    {
      id: 6,
      category: 'menu',
      title: 'Creating Menu Items',
      description: 'Build menu items by combining ingredients with automatic allergen calculation',
      icon: ChefHat,
      color: 'pink'
    },
    {
      id: 7,
      category: 'menu',
      title: 'Allergen Warnings',
      description: 'Understanding allergen warning levels: Contains, May Contain, Traces, Not Suitable',
      icon: Shield,
      color: 'red'
    },
    {
      id: 8,
      category: 'menu',
      title: 'Dietary Attributes',
      description: 'Add dietary certifications like Vegan, Gluten-Free, Halal, and more',
      icon: CheckCircle,
      color: 'teal'
    },
    {
      id: 9,
      category: 'sites',
      title: 'Site Configuration',
      description: 'Set up your locations and configure kiosk settings',
      icon: Building,
      color: 'blue'
    },
    {
      id: 10,
      category: 'sites',
      title: 'Kiosk Customization',
      description: 'Customise the look and feel of your customer-facing kiosks',
      icon: Settings,
      color: 'gray'
    },
    {
      id: 11,
      category: 'compliance',
      title: 'Allergen Compliance Guide',
      description: 'Ensure your allergen information meets regulatory requirements',
      icon: Shield,
      color: 'red'
    },
    {
      id: 12,
      category: 'compliance',
      title: 'Datasheet Review Process',
      description: 'Set up review reminders and keep your documentation up to date',
      icon: FileText,
      color: 'amber'
    },
    {
      id: 13,
      category: 'downloads',
      title: 'Generating Reports',
      description: 'Create allergen guides, compliance reports, and printable materials',
      icon: Download,
      color: 'blue'
    },
    {
      id: 14,
      category: 'downloads',
      title: 'Viewing All Datasheets',
      description: 'Access and manage all product datasheets in one central location',
      icon: FileText,
      color: 'purple'
    }
  ]

  const filteredTopics = helpTopics.filter(topic => {
    const matchesCategory = activeCategory === 'all' || topic.category === activeCategory
    const matchesSearch = topic.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         topic.description.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const quickLinks = [
    {
      title: 'Video Tutorials',
      description: 'Watch step-by-step video guides',
      icon: Video,
      href: '#videos',
      color: 'red'
    },
    {
      title: 'Documentation',
      description: 'Read detailed documentation',
      icon: Book,
      href: '#docs',
      color: 'blue'
    },
    {
      title: 'Contact Support',
      description: 'Get help from our team',
      icon: MessageCircle,
      href: '#contact',
      color: 'green'
    },
    {
      title: 'Email Us',
      description: 'support@allyjen.com',
      icon: Mail,
      href: 'mailto:support@allyjen.com',
      color: 'purple'
    }
  ]

  return (
    <Container>
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gradient-to-br from-teal-400 to-teal-600 dark:from-teal-500 dark:to-gray-700 rounded-lg">
                <HelpCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-[#003842] dark:text-white">Help & Support</h1>
                <p className="text-gray-600 dark:text-gray-300">
                  Learn how to use the AllyJen platform effectively
                </p>
              </div>
            </div>
          </div>
          <Badge variant="primary" icon={Book}>
            Knowledge Base
          </Badge>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {quickLinks.map((link, index) => (
          <a
            key={index}
            href={link.href}
            className="block"
          >
            <Card className="hover:shadow-lg transition-all hover:scale-105 cursor-pointer h-full">
              <div className="flex items-start gap-3">
                <div 
                  className={`p-3 rounded-lg bg-${link.color}-100`}
                  style={{
                    backgroundColor: 
                      link.color === 'red' ? '#fee2e2' :
                      link.color === 'blue' ? '#dbeafe' :
                      link.color === 'green' ? '#dcfce7' :
                      '#f3e8ff'
                  }}
                >
                  <link.icon 
                    className="h-6 w-6"
                    style={{
                      color: 
                        link.color === 'red' ? '#dc2626' :
                        link.color === 'blue' ? '#2563eb' :
                        link.color === 'green' ? '#16a34a' :
                        '#9333ea'
                    }}
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{link.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{link.description}</p>
                </div>
                <ExternalLink className="h-4 w-4 text-gray-400" />
              </div>
            </Card>
          </a>
        ))}
      </div>

      {/* Search and Categories */}
      <Card className="mb-8">
        <div className="p-6">
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search help topics..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-3 w-full border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent text-lg bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
            />
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => {
              const isActive = activeCategory === category.id
              return (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all
                    ${isActive
                      ? 'border-[#42b8ac] bg-[#42b8ac]/10 text-[#003842] dark:text-white font-medium'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }
                  `}
                >
                  <category.icon className={`h-4 w-4 ${isActive ? 'text-[#42b8ac]' : 'text-gray-500 dark:text-gray-400'}`} />
                  {category.name}
                </button>
              )
            })}
          </div>
        </div>
      </Card>

      {/* Help Topics */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {activeCategory === 'all' ? 'All Topics' : categories.find(c => c.id === activeCategory)?.name}
          <span className="text-gray-500 dark:text-gray-400 font-normal ml-2">({filteredTopics.length})</span>
        </h2>
      </div>

      {filteredTopics.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <HelpCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No topics found</h3>
            <p className="text-gray-600 dark:text-gray-400">Try adjusting your search or filters</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTopics.map((topic) => {
            const colorClasses = {
              purple: 'from-purple-500 to-purple-600',
              blue: 'from-blue-500 to-blue-600',
              green: 'from-green-500 to-green-600',
              orange: 'from-orange-500 to-orange-600',
              indigo: 'from-indigo-500 to-indigo-600',
              pink: 'from-pink-500 to-pink-600',
              red: 'from-red-500 to-red-600',
              teal: 'from-teal-500 to-teal-600',
              amber: 'from-amber-500 to-amber-600',
              gray: 'from-gray-500 to-gray-600'
            }

            return (
              <Card key={topic.id} className="hover:shadow-lg transition-all cursor-pointer group">
                <div className="flex items-start gap-4">
                  <div className={`p-3 bg-gradient-to-br ${colorClasses[topic.color as keyof typeof colorClasses]} rounded-lg group-hover:scale-110 transition-transform`}>
                    <topic.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-[#42b8ac] transition-colors">
                      {topic.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                      {topic.description}
                    </p>
                    <div className="flex items-center text-[#42b8ac] text-sm font-medium">
                      Learn more
                      <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Contact Support Section */}
      <Card className="mt-8 bg-gradient-to-br from-[#42b8ac]/10 to-[#003842]/10 border-2 border-[#42b8ac]/20">
        <div className="text-center">
          <MessageCircle className="h-12 w-12 text-[#42b8ac] mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#003842] dark:text-white mb-2">
            Need More Help?
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Can't find what you're looking for? Our support team is here to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="primary" size="lg" icon={MessageCircle}>
              Contact Support
            </Button>
            <Button variant="secondary" size="lg" icon={Mail}>
              Email Us
            </Button>
          </div>
        </div>
      </Card>

      {/* Development Note */}
      <Card className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <Book className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">Content Placeholder</h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              This help page structure is ready for your custom content. Each topic can be expanded into a full guide with:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-blue-700 dark:text-blue-300">
              <li>• Step-by-step instructions</li>
              <li>• Screenshots and videos</li>
              <li>• Best practices and tips</li>
              <li>• Common troubleshooting solutions</li>
            </ul>
          </div>
        </div>
      </Card>
    </Container>
  )
}
