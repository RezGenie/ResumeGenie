"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Github, Users, ExternalLink, Mail } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Logo } from "@/components/ui/logo"

export default function Contact() {
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
            Contact Us
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Get in touch with our team and learn more about the project behind the magic
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {/* Project Info */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  About the Project
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  RezGenie is a <strong>capstone project</strong> developed as part of our academic program. 
                  It represents the culmination of our studies.
                </p>
                <div className="space-y-2">
                  <p className="text-sm">
                    <strong>Course:</strong> INFO6156 - Capstone Project
                  </p>
                  <p className="text-sm">
                    <strong>Academic Year:</strong> 2025
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* GitHub Repository */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Github className="h-5 w-5" />
                  Open Source
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  RezGenie is open source! Check out our code, contribute to the project, 
                  or learn from our implementation.
                </p>
                <Button asChild className="w-full">
                  <a 
                    href="https://github.com/RezGenie/ResumeGenie" 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <Github className="mr-2 h-4 w-4" />
                    View on GitHub
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Team Members */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mb-16"
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Meet the Team</CardTitle>
              <p className="text-center text-muted-foreground">
                The talented individuals behind RezGenie
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                {/* Team Member 1 */}
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">👩‍💻</span>
                  </div>
                  <h3 className="font-semibold">Yaqin Albirawi</h3>
                  <p className="text-sm text-muted-foreground">AI/ML Engineer</p>
                </div>

                {/* Team Member 2 */}
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">👨‍💻</span>
                  </div>
                  <h3 className="font-semibold">Salih Elfatih</h3>
                  <p className="text-sm text-muted-foreground">Backend Specialist</p>
                </div>

                {/* Team Member 3 */}
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">👨‍💻</span>
                  </div>
                  <h3 className="font-semibold">David Lee</h3>
                  <p className="text-sm text-muted-foreground">DevOps Engineer</p>
                </div>

                {/* Team Member 4 */}
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">👨‍💻</span>
                  </div>
                  <h3 className="font-semibold">Andy Pham</h3>
                  <p className="text-sm text-muted-foreground">Frontend Specialist</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Contact Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="text-center"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-center gap-2">
                <Mail className="h-5 w-5" />
                Get in Touch
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-6">
                Have questions about RezGenie or want to collaborate? We&apos;d love to hear from you!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="outline" asChild>
                  <a 
                    href="https://github.com/RezGenie/ResumeGenie/issues" 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <Github className="mr-2 h-4 w-4" />
                    Report Issues
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/">
                    <Logo className="h-6 w-6" />
                    Try RezGenie
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      <Footer />
    </div>
  )
}