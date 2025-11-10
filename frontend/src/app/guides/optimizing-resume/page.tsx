"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { CheckCircle, Target, ArrowLeft, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

export default function OptimizingResume() {
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
            Optimizing Your Resume
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Learn how to create a compelling resume that stands out to recruiters and passes ATS systems.
          </p>
          <div className="flex items-center justify-center gap-4 mt-4 text-sm text-muted-foreground">
            <span>5 min read</span>
            <span>•</span>
            <span>Career Tips</span>
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
                  Your resume is your first impression with potential employers. In today&apos;s competitive job market, 
                  it needs to not only showcase your skills and experience but also pass through Applicant Tracking 
                  Systems (ATS) that many companies use to filter candidates.
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* ATS Optimization */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  ATS-Friendly Formatting
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Applicant Tracking Systems scan your resume for keywords and structure. Here&apos;s how to optimize for ATS:
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-purple-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold">Use Standard Headings</h3>
                      <p className="text-sm text-muted-foreground">
                        Stick to common section headers like &quot;Work Experience,&quot; &quot;Education,&quot; and &quot;Skills&quot;
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-purple-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold">Choose Simple Fonts</h3>
                      <p className="text-sm text-muted-foreground">
                        Use Arial, Calibri, or Times New Roman. Avoid fancy fonts and graphics
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-purple-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold">Include Relevant Keywords</h3>
                      <p className="text-sm text-muted-foreground">
                        Match keywords from the job description naturally throughout your resume
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-purple-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold">Save as PDF and Word</h3>
                      <p className="text-sm text-muted-foreground">
                        Have both formats ready, as different systems prefer different formats
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Content Optimization */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Content That Converts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-3 text-purple-600">✓ Do This</h3>
                    <ul className="space-y-2 text-sm">
                      <li>• Start bullets with action verbs</li>
                      <li>• Quantify achievements with numbers</li>
                      <li>• Tailor content to each job</li>
                      <li>• Focus on results and impact</li>
                      <li>• Use industry-specific terminology</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-3 text-purple-600">✗ Avoid This</h3>
                    <ul className="space-y-2 text-sm">
                      <li>• Generic job descriptions</li>
                      <li>• Passive language</li>
                      <li>• Irrelevant personal information</li>
                      <li>• Overly long paragraphs</li>
                      <li>• Outdated or irrelevant skills</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Key Sections */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Essential Resume Sections</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-2">1. Professional Summary</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      2-3 lines highlighting your key qualifications and career goals.
                    </p>
                    <div className="bg-muted/50 p-3 rounded text-sm">
                      <em>&quot;Results-driven software engineer with 5+ years of experience building scalable web applications. 
                      Proven track record of reducing load times by 40% and leading cross-functional teams.&quot;</em>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-2">2. Work Experience</h3>
                    <p className="text-sm text-muted-foreground">
                      List positions in reverse chronological order with quantifiable achievements.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-2">3. Skills Section</h3>
                    <p className="text-sm text-muted-foreground">
                      Include both technical and soft skills relevant to your target role.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-2">4. Education</h3>
                    <p className="text-sm text-muted-foreground">
                      Include degree, institution, and graduation year. Add relevant coursework for new graduates.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Call to Action */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <Card>
              <CardContent className="py-8 text-center">
                <h2 className="text-2xl font-bold mb-4">
                  Ready to Optimize Your Resume?
                </h2>
                <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                  Put these tips into practice with RezGenie&apos;s AI-powered analysis. 
                  Get personalized feedback on your resume structure, content, and ATS compatibility.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button asChild size="lg">
                    <Link href="/genie">
                      <Sparkles className="mr-2 h-5 w-5" />
                      Analyze My Resume
                    </Link>
                  </Button>
                  <Button variant="outline" asChild size="lg" className="hover:bg-purple-50 hover:text-purple-600 hover:border-purple-300 dark:hover:bg-purple-950/20 dark:hover:text-purple-400 dark:hover:border-purple-800">
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