"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowLeft, Users, Briefcase, MessageSquare, Sparkles, CheckCircle, Target } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Logo } from "@/components/ui/logo"

export default function GetMoreInterviews() {
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
            Getting More Interviews
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Strategic tips and tactics to increase your interview callbacks and land your dream job.
          </p>
          <div className="flex items-center justify-center gap-4 mt-4 text-sm text-muted-foreground">
            <span>7 min read</span>
            <span>•</span>
            <span>Job Search Strategy</span>
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
                  Getting more interviews is about more than just having a great resume. It&apos;s about strategic 
                  positioning, targeted applications, and building relationships in your industry. 
                  Here&apos;s your comprehensive guide to dramatically increasing your interview rate.
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Resume Optimization */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Strategic Resume Optimization
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Your resume needs to be both human-readable and ATS-friendly. Here&apos;s how to optimize for both:
                </p>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold">Tailor for Each Application</h3>
                      <p className="text-sm text-muted-foreground">
                        Customize your resume for each job by matching 60-80% of the keywords from the job description. 
                        Use RezGenie&apos;s job matching feature to identify the right keywords.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold">Quantify Everything</h3>
                      <p className="text-sm text-muted-foreground">
                        Use numbers, percentages, and metrics to demonstrate impact: 
                        &quot;Increased sales by 35%&quot; is much stronger than &quot;Improved sales performance.&quot;
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold">Lead with Impact</h3>
                      <p className="text-sm text-muted-foreground">
                        Start each bullet point with a strong action verb and focus on results rather than responsibilities.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Application Strategy */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Smart Application Strategy</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-primary">Quality Over Quantity</h3>
                    <ul className="space-y-2 text-sm">
                      <li>• Apply to 5-10 highly targeted jobs per week</li>
                      <li>• Research each company thoroughly</li>
                      <li>• Customize your application materials</li>
                      <li>• Follow up appropriately</li>
                    </ul>
                  </div>
                  <div className="space-y-4">
                    <h3 className="font-semibold text-primary">Timing Matters</h3>
                    <ul className="space-y-2 text-sm">
                      <li>• Apply within 24-48 hours of job posting</li>
                      <li>• Tuesday-Thursday applications get more attention</li>
                      <li>• Apply early in the day (8-10 AM)</li>
                      <li>• Avoid holiday periods when possible</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Networking */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  The Power of Networking
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  80% of jobs are never publicly advertised. Networking helps you access the hidden job market:
                </p>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto mb-2">
                      <Users className="h-6 w-6" />
                    </div>
                    <h3 className="font-semibold text-sm">LinkedIn Networking</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Connect with professionals in your target companies
                    </p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="w-12 h-12 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center mx-auto mb-2">
                      <MessageSquare className="h-6 w-6" />
                    </div>
                    <h3 className="font-semibold text-sm">Informational Interviews</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Learn about roles and build relationships
                    </p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="w-12 h-12 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center mx-auto mb-2">
                      <Target className="h-6 w-6" />
                    </div>
                    <h3 className="font-semibold text-sm">Industry Events</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Attend meetups, conferences, and virtual events
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Cover Letter Strategy */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Cover Letter That Gets Noticed</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  A well-crafted cover letter can increase your interview chances by 30%. Here&apos;s the formula:
                </p>
                <div className="space-y-4">
                  <div className="border-l-4 border-primary pl-4">
                    <h3 className="font-semibold">Opening Hook</h3>
                    <p className="text-sm text-muted-foreground">
                      Start with a compelling statement about your relevant achievement or connection to the company.
                    </p>
                  </div>
                  <div className="border-l-4 border-green-500 pl-4">
                    <h3 className="font-semibold">Value Proposition</h3>
                    <p className="text-sm text-muted-foreground">
                      Clearly state how you can solve their specific problems, using examples from your experience.
                    </p>
                  </div>
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h3 className="font-semibold">Call to Action</h3>
                    <p className="text-sm text-muted-foreground">
                      End with a confident request for an interview and mention you&apos;ll follow up.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Follow-up Strategy */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Strategic Follow-up</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    Following up professionally can set you apart from other candidates:
                  </p>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold mb-3 text-green-600">✓ Effective Follow-up</h3>
                      <ul className="space-y-2 text-sm">
                        <li>• Wait 1-2 weeks after applying</li>
                        <li>• Send a brief, professional email</li>
                        <li>• Reiterate your interest and value</li>
                        <li>• Include any new relevant achievements</li>
                        <li>• Follow up once more after 2 weeks</li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-3 text-red-600">✗ Avoid These Mistakes</h3>
                      <ul className="space-y-2 text-sm">
                        <li>• Following up too frequently</li>
                        <li>• Being pushy or demanding</li>
                        <li>• Sending generic follow-ups</li>
                        <li>• Following up immediately after applying</li>
                        <li>• Using inappropriate channels (personal social media)</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Metrics to Track */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Track Your Success</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Monitor these key metrics to optimize your job search strategy:
                </p>
                <div className="grid md:grid-cols-4 gap-4 text-center">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-primary">2-5%</div>
                    <div className="text-sm text-muted-foreground">Response Rate Goal</div>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-green-500">10-20%</div>
                    <div className="text-sm text-muted-foreground">Interview Rate Goal</div>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-500">5-10</div>
                    <div className="text-sm text-muted-foreground">Applications/Week</div>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-500">3-6</div>
                    <div className="text-sm text-muted-foreground">Months Average</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Call to Action */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.9 }}
          >
            <Card>
              <CardContent className="py-8 text-center">
                <Logo className="h-6 w-6" />
                <h2 className="text-2xl font-bold mb-4">
                  Ready to Boost Your Interview Rate?
                </h2>
                <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                  Start by optimizing your resume with RezGenie&apos;s AI analysis, then implement these proven strategies 
                  to dramatically increase your interview callbacks.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button asChild size="lg">
                    <Link href="/genie">
                      <Sparkles className="mr-2 h-5 w-5" />
                      Optimize My Resume
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