// app/admin/help/page.tsx
'use client'

import { useState } from 'react'
import { 
  HelpCircle, Book, FileText, MessageCircle, 
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
  const [expandedTopic, setExpandedTopic] = useState<number | null>(null)

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

  const topicDetails: Record<number, string[]> = {
    1: [
      'Create your account and verify your email address.',
      'Set up your first site (location) under Sites & Locations → Add Site.',
      'Add your first ingredients with allergen information in the Ingredients section.',
      'Use Menu Builder to combine ingredients into menu items — allergens are calculated automatically.',
      'Pair a kiosk device to a site using the pairing code found in Site Settings → Devices.',
      'Review your allergen coverage overview in the Analytics section.',
    ],
    2: [
      'Dashboard — At-a-glance view of recent activity and your most frequently used tools.',
      'Ingredients — Your central library of ingredient records, each with allergen info, suppliers, and datasheets.',
      'Menu Builder — Combine ingredients into menu items with automatic allergen profile calculation.',
      'Sites & Locations — Manage physical locations, pair kiosk devices, and control per-site menu visibility.',
      'Analytics — Allergen coverage summaries, compliance stats, and usage insights.',
      'Reports & Downloads — Generate and export printable allergen guides and compliance documents.',
      'Settings — Account details, branding, notification preferences, and subscription management.',
    ],
    3: [
      'Navigate to Ingredients → New Ingredient.',
      'Enter the ingredient name and select a category.',
      'Set allergen warning levels for each of the 14 EU-mandated allergens.',
      'For Cereals/Gluten and Tree Nuts, specify sub-types where applicable.',
      'Add relevant dietary certifications (Vegan, Halal, Gluten-Free, etc.).',
      'Optionally upload a product datasheet or supplier spec sheet.',
      'Link one or more suppliers and save — the ingredient is now available in Menu Builder.',
    ],
    4: [
      'Datasheets are supplier-provided PDF spec sheets confirming allergen and ingredient information.',
      'Upload a datasheet on any ingredient record under the Datasheets tab.',
      'Set a review date when uploading — you will be reminded before it expires.',
      'View and manage all datasheets centrally via Downloads → All Datasheets.',
      'Datasheets approaching or past their review date are flagged in your Notifications panel.',
      'Keeping datasheets current is essential for your allergen compliance audit trail.',
    ],
    5: [
      'Each ingredient can have one or more linked suppliers.',
      'Add a supplier on any ingredient record under the Suppliers tab.',
      'Record the supplier name, contact email, phone number, and any reference codes.',
      'Multiple suppliers allow you to track alternative sourcing options.',
      'Supplier information is included in compliance exports and audit reports.',
    ],
    6: [
      'Navigate to Menu Builder → New Item.',
      'Name your menu item and choose its category.',
      'Search for and add ingredients from your ingredient library.',
      'AllyJen automatically calculates the combined allergen profile from all added ingredients.',
      'Review the auto-calculated allergens — you can override any level if the finished dish differs.',
      'Add dietary certifications that apply to the final prepared dish.',
      'Save — the item is immediately live and displayed on paired kiosks.',
    ],
    7: [
      'Contains — The allergen is a deliberate, listed ingredient in the recipe.',
      'May Contain — Shared equipment or production lines create a cross-contamination risk.',
      'Traces — Trace amounts may be present due to the manufacturing environment.',
      'Not Suitable — The product is not considered safe for people with this allergy.',
      'None — No risk of this allergen being present.',
      'When a menu item is built from multiple ingredients, AllyJen applies the highest warning level found across all ingredients for each allergen.',
    ],
    8: [
      'Vegan — Contains no animal products of any kind.',
      'Vegetarian — No meat or fish; may contain dairy or eggs.',
      'Gluten-Free — Confirmed free from gluten-containing cereals.',
      'Dairy-Free — Contains no milk or milk-derived ingredients.',
      'Halal — Prepared in accordance with Islamic dietary guidelines.',
      'Kosher — Prepared in accordance with Jewish dietary guidelines.',
      'Certifications can be applied at ingredient level and/or menu item level. Menu item certifications take precedence when displaying to customers.',
    ],
    9: [
      'Navigate to Sites & Locations → Add Site.',
      'Enter your site name, physical address, and contact details.',
      'Each site gets its own unique kiosk display URL.',
      'Enable or disable menu categories per site to control what customers see.',
      'Manage devices (kiosks) for the site under the Devices tab — generate a pairing code to link a new device.',
    ],
    10: [
      'In Sites & Locations, select a site and open Kiosk Settings.',
      'Upload your logo for the kiosk header and branded display.',
      'Choose a primary brand colour to match your venue.',
      'Toggle which menu categories and items are visible at this location.',
      'Changes are reflected on the live kiosk immediately upon saving.',
      'Use the Preview button to see how your kiosk looks before going live.',
    ],
    11: [
      'EU Regulation 1169/2011 requires the 14 major allergens to be declared on all food products.',
      'For pre-packed food: allergens must be emphasised in the ingredients list (bold, underline, or different colour).',
      'For non-prepacked/loose food: allergen information must be available on request or proactively displayed.',
      'AllyJen helps you maintain accurate allergen records and generate compliant labelling and display materials.',
      'Review allergen data regularly — update records whenever supplier formulations change.',
      'Tip: Generate an allergen matrix from the Reports section to print and display in-venue for staff and customers.',
    ],
    12: [
      'When uploading a datasheet, set a review date (typically annual or when a formulation change is expected).',
      'AllyJen flags datasheets approaching their review date in your Notifications panel.',
      'Click Review on a flagged datasheet to confirm it is still current, or upload a replacement document.',
      'Reviewed datasheets reset their review countdown from the date of review.',
      'Maintaining up-to-date datasheets provides a clear, dated audit trail for compliance inspections.',
    ],
    13: [
      'Navigate to Downloads & Reports.',
      'Choose from: Allergen Matrix (all menu items vs. all allergens), Full Ingredient Report, or Compliance Summary.',
      'Apply filters by site, category, or date range to narrow the report scope.',
      'Download reports as PDF for printing or as CSV for spreadsheet use.',
      'Printed allergen matrices are a practical compliance tool to display for staff and customers in-venue.',
    ],
    14: [
      'Go to Downloads → All Datasheets for a central view of every uploaded spec sheet across all ingredients.',
      'Filter by status: Current, Due for Review, Overdue, or Missing.',
      'Click any datasheet entry to open or download the original PDF.',
      'Use the bulk export option to download all datasheets as a ZIP file — useful for audits or off-site review.',
      'Missing datasheets (ingredients with no uploaded spec sheet) are highlighted so you can follow up with suppliers.',
    ],
  }

  const filteredTopics = helpTopics.filter(topic => {
    const matchesCategory = activeCategory === 'all' || topic.category === activeCategory
    const matchesSearch = topic.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         topic.description.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const quickLinks = [
    {
      title: 'Documentation',
      description: 'Read detailed documentation',
      icon: Book,
      href: '#help-topics',
      color: 'blue'
    },
    {
      title: 'Contact Support',
      description: 'Get help from our team',
      icon: MessageCircle,
      href: 'mailto:info@allyjen.ie',
      color: 'green'
    },
    {
      title: 'Email Us',
      description: 'info@allyjen.ie',
      icon: Mail,
      href: 'mailto:info@allyjen.ie',
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
      <div className="mb-6" id="help-topics">
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

            const isExpanded = expandedTopic === topic.id
            return (
              <div
                key={topic.id}
                role="button"
                tabIndex={0}
                onClick={() => setExpandedTopic(isExpanded ? null : topic.id)}
                onKeyDown={(e) => e.key === 'Enter' && setExpandedTopic(isExpanded ? null : topic.id)}
                className="cursor-pointer group"
              >
                <Card className="hover:shadow-lg transition-all">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 bg-gradient-to-br ${colorClasses[topic.color as keyof typeof colorClasses]} rounded-lg group-hover:scale-110 transition-transform flex-shrink-0`}>
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
                        {isExpanded ? 'Close' : 'Learn more'}
                        <ChevronRight className={`h-4 w-4 ml-1 transition-transform ${isExpanded ? 'rotate-90' : 'group-hover:translate-x-1'}`} />
                      </div>
                    </div>
                  </div>
                  {isExpanded && topicDetails[topic.id] && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                      <ol className="space-y-2">
                        {topicDetails[topic.id].map((point: string, i: number) => (
                          <li key={i} className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                            <span
                              className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
                              style={{ backgroundColor: '#42b8ac' }}
                            >
                              {i + 1}
                            </span>
                            {point}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </Card>
              </div>
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
            <a href="mailto:info@allyjen.ie">
              <Button variant="primary" size="lg" icon={<MessageCircle className="h-4 w-4" />}>
                Contact Support
              </Button>
            </a>
            <a href="mailto:info@allyjen.ie">
              <Button variant="secondary" size="lg" icon={<Mail className="h-4 w-4" />}>
                Email Us
              </Button>
            </a>
          </div>
        </div>
      </Card>

    </Container>
  )
}
