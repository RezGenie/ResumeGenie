"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Users, FileText, AlertTriangle, Mail, ExternalLink } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-20 max-w-4xl">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-foreground">
            Terms of Service
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Please read these terms carefully before using RezGenie&apos;s AI-powered resume optimization platform.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Last updated: September 26, 2025
          </p>
        </motion.div>

        <div className="space-y-8">
          {/* Acceptance */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Acceptance of Terms
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  By accessing and using RezGenie, you accept and agree to be bound by the terms and provision of this agreement. 
                  RezGenie is an academic project created for educational purposes as part of the INFO6156 Capstone Project.
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Service Description */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Service Description</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  RezGenie provides AI-powered resume analysis and optimization services, including:
                </p>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Resume parsing and content analysis</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Job description compatibility scoring</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Personalized career recommendations (&quot;Genie Wishes&quot;)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Skill gap analysis and improvement suggestions</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </motion.div>

          {/* User Responsibilities */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Responsibilities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  By using RezGenie, you agree to:
                </p>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Provide accurate and truthful information in your resume and profile</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Use the service for legitimate career development purposes only</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Not upload malicious files or attempt to compromise the system</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Respect the intellectual property of others and our platform</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Keep your account credentials secure and confidential</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </motion.div>

          {/* Academic Project Notice */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Academic Project Notice
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <p className="text-muted-foreground">
                    <strong>Important:</strong> RezGenie is an academic project developed for educational purposes 
                    as part of the INFO6156 Capstone Project. While we strive to provide accurate and helpful 
                    career insights, this platform is primarily a demonstration of AI and web development capabilities.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Data and Privacy */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Data and Privacy</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Your privacy is important to us. By using RezGenie, you acknowledge that:
                </p>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Your data will be processed according to our Privacy Policy</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Resume content may be analyzed using third-party AI services</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>You can delete your account and data at any time</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>We implement reasonable security measures to protect your information</span>
                  </li>
                </ul>
                <div className="mt-4">
                  <Button variant="outline" asChild>
                    <Link href="/privacy">
                      View Privacy Policy
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Disclaimers */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Disclaimers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Service Availability</h3>
                  <p className="text-muted-foreground text-sm">
                    As an academic project, RezGenie may experience downtime or service interruptions. 
                    We do not guarantee continuous availability.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">AI Recommendations</h3>
                  <p className="text-muted-foreground text-sm">
                    AI-generated recommendations are suggestions only and should not be considered professional 
                    career advice. Always use your judgment when making career decisions.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">No Warranty</h3>
                  <p className="text-muted-foreground text-sm">
                    The service is provided &quot;as is&quot; without any warranties of any kind, either express or implied.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Contact */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Questions About These Terms?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  If you have any questions about these Terms of Service, please contact us.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button variant="outline" asChild>
                    <Link href="/contact">
                      <Mail className="mr-2 h-4 w-4" />
                      Contact Us
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <a 
                      href="https://github.com/RezGenie/ResumeGenie" 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View on GitHub
                    </a>
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