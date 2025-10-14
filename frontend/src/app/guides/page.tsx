"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { FileText, Sparkles, Target, ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Logo } from "@/components/ui/logo"

export default function Guides() {
  const guides = [
    {
      href: "/guides/optimizing-resume",
      icon: <FileText className="h-6 w-6" />,
      title: "Optimizing Your Resume",
      description: "Learn how to create a compelling resume that stands out to recruiters and passes ATS systems.",
      color: "bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500",
      readTime: "5 min read"
    },
    {
      href: "/guides/genie-wishes",
      icon: <Sparkles className="h-6 w-6" />,
      title: "Making the Most of Genie Wishes",
      description: "Discover how to leverage RezGenie's AI recommendations to accelerate your career growth.",
      color: "bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500",
      readTime: "3 min read"
    },
    {
      href: "/guides/get-more-interviews",
      icon: <Target className="h-6 w-6" />,
      title: "Getting More Interviews",
      description: "Strategic tips and tactics to increase your interview callbacks and land your dream job.",
      color: "bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500",
      readTime: "7 min read"
    }
  ]

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-20 max-w-6xl">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-foreground">
            Career Guides
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Expert tips and strategies to optimize your resume, leverage AI recommendations, 
            and accelerate your job search success.
          </p>
        </motion.div>

        {/* Guides Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {guides.map((guide, index) => (
            <motion.div
              key={guide.href}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
            >
              <Link href={guide.href}>
                <div className={`h-full rounded-2xl p-8 hover:shadow-lg transition-all duration-300 group cursor-pointer border ${guide.color.includes('blue') && !guide.color.includes('gradient') ? 'bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-blue-200 dark:border-blue-800' : guide.color.includes('purple') && !guide.color.includes('gradient') ? 'bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200 dark:border-purple-800' : guide.color.includes('gradient') ? 'bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-blue-950/20 dark:via-purple-950/20 dark:to-pink-950/20 border-purple-200 dark:border-purple-800' : 'bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-blue-950/20 dark:via-purple-950/20 dark:to-pink-950/20 border-purple-200 dark:border-purple-800'}`}>
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ${guide.color.includes('blue') && !guide.color.includes('gradient') ? 'bg-blue-100 dark:bg-blue-900/50' : guide.color.includes('purple') && !guide.color.includes('gradient') ? 'bg-purple-100 dark:bg-purple-900/50' : guide.color.includes('gradient') ? 'bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 dark:from-blue-900/50 dark:via-purple-900/50 dark:to-pink-900/50' : 'bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 dark:from-blue-900/50 dark:via-purple-900/50 dark:to-pink-900/50'}`}>
                    {guide.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-4 group-hover:text-primary transition-colors">
                    {guide.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    {guide.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {guide.readTime}
                    </span>
                    <div className="flex items-center text-sm text-primary group-hover:gap-2 transition-all">
                      <span>Read Guide</span>
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Quick Tips */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mb-16"
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Quick Tips for Success</CardTitle>
              <p className="text-center text-muted-foreground">
                Essential principles to keep in mind during your job search
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <span className="text-green-500 mt-1">✓</span>
                    <div>
                      <h3 className="font-semibold">Tailor for Each Role</h3>
                      <p className="text-sm text-muted-foreground">
                        Customize your resume for each specific job application
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-green-500 mt-1">✓</span>
                    <div>
                      <h3 className="font-semibold">Use Action Verbs</h3>
                      <p className="text-sm text-muted-foreground">
                        Start bullet points with strong action words
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-green-500 mt-1">✓</span>
                    <div>
                      <h3 className="font-semibold">Quantify Achievements</h3>
                      <p className="text-sm text-muted-foreground">
                        Include numbers, percentages, and measurable results
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <span className="text-green-500 mt-1">✓</span>
                    <div>
                      <h3 className="font-semibold">Keep It Concise</h3>
                      <p className="text-sm text-muted-foreground">
                        Aim for 1-2 pages maximum for most positions
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-green-500 mt-1">✓</span>
                    <div>
                      <h3 className="font-semibold">ATS-Friendly Format</h3>
                      <p className="text-sm text-muted-foreground">
                        Use standard headings and avoid complex formatting
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-green-500 mt-1">✓</span>
                    <div>
                      <h3 className="font-semibold">Include Keywords</h3>
                      <p className="text-sm text-muted-foreground">
                        Match relevant keywords from the job description
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="text-center"
        >
          <Card>
            <CardContent className="py-8">
              <Logo className="h-16 w-16 mb-4 mx-auto" />
              <h2 className="text-2xl font-bold mb-4">
                Ready to Optimize Your Resume?
              </h2>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                Put these guides into practice with RezGenie&apos;s AI-powered analysis. 
                Get personalized recommendations and watch your career prospects improve!
              </p>
              <Button asChild size="lg">
                <Link href="/genie">
                  <Sparkles className="mr-2 h-5 w-5" />
                  Try RezGenie Now
                </Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      <Footer />
    </div>
  )
}