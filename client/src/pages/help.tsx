import { HelpCircle, Book, MessageCircle, Mail, ExternalLink, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "How do I connect to another computer?",
    answer:
      "To connect to another computer, you need the Partner ID of the remote device. Enter this 9-digit ID in the 'Control Remote Computer' section on the dashboard and click Connect. The remote user will need to accept the connection request.",
  },
  {
    question: "How do I allow someone to view my screen?",
    answer:
      "Share your Partner ID (displayed on your dashboard) with the person who needs to connect. When they attempt to connect, you'll receive a notification to accept or decline the connection.",
  },
  {
    question: "Is the connection secure?",
    answer:
      "Yes, all connections are encrypted end-to-end using WebRTC technology. Your screen content is transmitted directly between devices (peer-to-peer) when possible, minimizing exposure to external servers.",
  },
  {
    question: "Can the viewer control my computer?",
    answer:
      "The current web-based version supports remote viewing and pointer overlay (the viewer can show where to click). For full remote control capabilities, a native desktop application would be required due to browser security restrictions.",
  },
  {
    question: "How do I transfer files?",
    answer:
      "During an active session, click the file transfer icon in the control toolbar. You can then drag and drop files or use the file picker to select files to send to the connected device.",
  },
  {
    question: "Why is my connection quality poor?",
    answer:
      "Connection quality depends on both parties' internet speed and network conditions. Try adjusting the quality settings to 'Balanced' or 'Low Bandwidth' mode in Settings > Quality. Ensure you're on a stable network connection.",
  },
  {
    question: "How do I save a connection for quick access?",
    answer:
      "Go to Saved Connections in the sidebar and click 'Add Connection'. Enter a name and the Partner ID to save it. You can then quickly connect from your saved list without re-entering the ID.",
  },
];

export default function HelpPage() {
  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">Help & Support</h1>
          <p className="text-muted-foreground">
            Find answers to common questions and get assistance
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="hover-elevate cursor-pointer">
            <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Book className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-medium">Documentation</p>
                <p className="text-sm text-muted-foreground">Browse guides</p>
              </div>
            </CardContent>
          </Card>

          <Card className="hover-elevate cursor-pointer">
            <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <MessageCircle className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-medium">Live Chat</p>
                <p className="text-sm text-muted-foreground">Get instant help</p>
              </div>
            </CardContent>
          </Card>

          <Card className="hover-elevate cursor-pointer">
            <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-medium">Email Support</p>
                <p className="text-sm text-muted-foreground">Contact us</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Frequently Asked Questions
            </CardTitle>
            <CardDescription>Quick answers to common questions</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left" data-testid={`faq-question-${index}`}>
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Start Guide</CardTitle>
            <CardDescription>Get up and running in minutes</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4">
              {[
                {
                  title: "Get your Partner ID",
                  description: "Your unique ID is displayed on the dashboard. Share it with someone who needs to connect to you.",
                },
                {
                  title: "Connect to a remote computer",
                  description: "Enter the Partner ID of the computer you want to view and click Connect.",
                },
                {
                  title: "Accept the connection",
                  description: "The remote user must accept your connection request for security.",
                },
                {
                  title: "Start collaborating",
                  description: "View the remote screen, use pointer overlay to guide, or chat in real-time.",
                },
              ].map((step, index) => (
                <li key={index} className="flex gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                    {index + 1}
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">{step.title}</p>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          <p>Can't find what you're looking for?</p>
          <Button variant="link" className="gap-1">
            Visit our support center
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
