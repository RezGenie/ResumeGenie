"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowLeft, Zap, Target, TrendingUp, FileText, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

export default function GenieWishes() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-20 max-w-4xl">
        {/* Navigation */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <Button variant="ghost" asChild>
            <Link href="/guides">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Guides
            </Link>
          </Button>
        </motion.div>

        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-center mb-16"
        >
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-foreground">
            Making the Most of Genie Wishes
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Discover how to leverage RezGenie&apos;s AI recommendations to accelerate your career growth.
          </p>
          <div className="flex items-center justify-center gap-4 mt-4 text-sm text-muted-foreground">
            <span>3 min read</span>
            <span>•</span>
            <span>AI Tips</span>
          </div>
        </motion.div>

        <div className="space-y-8">
          {/* Introduction */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground text-lg leading-relaxed">
                  RezGenie&apos;s &quot;Genie Wishes&quot; are AI-powered recommendations designed to give you personalized, 
                  actionable insights about your resume and career development. Think of them as your personal career coach, 
                  available 24/7 to help you improve your job search strategy.
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Types of Wishes */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Types of Genie Wishes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center flex-shrink-0">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Resume Analysis</h3>
                        <p className="text-sm text-muted-foreground">
                          Comprehensive feedback on your resume structure, content, and ATS compatibility
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-500/10 text-green-500 flex items-center justify-center flex-shrink-0">
                        <Target className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Job Match Score</h3>
                        <p className="text-sm text-muted-foreground">
                          See how well your resume aligns with specific job descriptions
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center flex-shrink-0">
                        <TrendingUp className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Skill Gap Analysis</h3>
                        <p className="text-sm text-muted-foreground">
                          Identify missing skills and get recommendations for career advancement
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center flex-shrink-0">
                        <Zap className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold">AI Recommendations</h3>
                        <p className="text-sm text-muted-foreground">
                          Personalized suggestions for improving your resume and job search strategy
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* How to Use Wishes Effectively */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>How to Use Wishes Effectively</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <span className="bg-primary/10 text-primary w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
                    Start with Resume Analysis
                  </h3>
                  <p className="text-muted-foreground text-sm ml-8">
                    Upload your current resume to get a comprehensive analysis of its strengths and areas for improvement. 
                    This gives you a baseline understanding of where you stand.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <span className="bg-primary/10 text-primary w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
                    Compare Against Job Descriptions
                  </h3>
                  <p className="text-muted-foreground text-sm ml-8">
                    For each job you&apos;re interested in, paste the job description to get a match score. 
                    This helps you understand how to tailor your resume for specific roles.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <span className="bg-primary/10 text-primary w-6 h-6 rounded-full flex items-center justify-center text-sm">3</span>
                    Focus on Skill Gaps
                  </h3>
                  <p className="text-muted-foreground text-sm ml-8">
                    Pay attention to skill gap recommendations. These highlight areas where you can improve 
                    to become more competitive in your target job market.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <span className="bg-primary/10 text-primary w-6 h-6 rounded-full flex items-center justify-center text-sm">4</span>
                    Implement AI Suggestions
                  </h3>
                  <p className="text-muted-foreground text-sm ml-8">
                    Take action on the specific recommendations provided. Update your resume, 
                    learn new skills, or adjust your job search strategy based on the insights.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Best Practices */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Best Practices</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-3 text-green-600">✓ Do This</h3>
                    <ul className="space-y-2 text-sm">
                      <li>• Use wishes regularly to track progress</li>
                      <li>• Compare against multiple job descriptions</li>
                      <li>• Save and revisit recommendations</li>
                      <li>• Update your resume based on feedback</li>
                      <li>• Focus on one improvement at a time</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-3 text-red-600">✗ Avoid This</h3>
                    <ul className="space-y-2 text-sm">
                      <li>• Ignoring consistent recommendations</li>
                      <li>• Only checking once and forgetting</li>
                      <li>• Trying to fix everything at once</li>
                      <li>• Not tailoring for specific jobs</li>
                      <li>• Dismissing feedback without consideration</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Daily Limits */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Understanding Your Daily Wishes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <p className="text-muted-foreground">
                    <strong>Free users get 3 wishes per day</strong> to encourage thoughtful use of our AI recommendations. 
                    This limit helps ensure quality responses and allows you to focus on implementing changes rather than 
                    endless analysis. Premium users get unlimited wishes for comprehensive career optimization.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Call to Action */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
          >
            <Card>
              <CardContent className="py-8 text-center">
                <span className="text-4xl mb-4 block">🧞‍♂️</span>
                <h2 className="text-2xl font-bold mb-4">
                  Ready to Make Your First Wish?
                </h2>
                <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                  Start with a resume analysis to understand your current position, 
                  then use job matching to see how you can improve for specific roles.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button asChild size="lg">
                    <Link href="/genie">
                      <Sparkles className="mr-2 h-5 w-5" />
                      Try Your First Wish
                    </Link>
                  </Button>
                  <Button variant="outline" asChild size="lg">
                    <Link href="/guides">
                      View More Guides
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  )
}