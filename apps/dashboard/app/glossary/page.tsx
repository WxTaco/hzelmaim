"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { BookOpen, HelpCircle, ArrowRight, Search } from "lucide-react";
import { useState } from "react";
import { PublicLayout } from "@/components/public-layout";

const glossaryTerms = [
  {
    term: "VPS (Virtual Private Server)",
    definition:
      "Think of it like renting an apartment in a building. You share the physical building (server) with others, but your space (virtual server) is completely private and isolated. You get guaranteed resources like CPU, RAM, and storage.",
    example:
      "A 2 CPU / 4GB RAM VPS means you have 2 processor cores and 4 gigabytes of memory dedicated to your applications.",
    category: "Infrastructure",
  },
  {
    term: "CPU Cores",
    definition:
      "The 'brains' of your server that process instructions. More cores mean your server can handle more tasks simultaneously, like running multiple applications or serving more visitors at once.",
    example:
      "A blog might need 1 core, while a busy web application might need 4+ cores.",
    category: "Resources",
  },
  {
    term: "RAM (Memory)",
    definition:
      "Your server's short-term memory where active programs and data are stored for quick access. More RAM allows your server to run more applications simultaneously without slowing down.",
    example:
      "4GB RAM can handle a small website and database, while 16GB+ is better for complex applications.",
    category: "Resources",
  },
  {
    term: "Bandwidth",
    definition:
      "The amount of data that can be transferred to and from your server, usually measured monthly. This includes all uploads and downloads—web pages served, files transferred, API calls, etc.",
    example:
      "If 1000 visitors view a 2MB page, that's roughly 2GB of bandwidth used.",
    category: "Network",
  },
  {
    term: "SSD Storage",
    definition:
      "The permanent storage space on your server where your files, databases, and applications live. SSDs (Solid State Drives) are much faster than traditional hard drives, making your server more responsive.",
    example:
      "A basic website might use 10GB, while a media-heavy application could need 100GB+.",
    category: "Resources",
  },
  {
    term: "Uptime",
    definition:
      "The percentage of time your server is operational and accessible. 99.9% uptime means your server could be down for about 8.76 hours per year. Higher uptime = more reliable hosting.",
    example: "99.99% uptime allows only ~52 minutes of downtime per year.",
    category: "Reliability",
  },
  {
    term: "Node / Host Machine",
    definition:
      "The physical server hardware that runs multiple virtual servers (VPS). The quality and capacity of this machine directly affects all VPS performance on it.",
    example:
      "If a node is overcrowded with too many VPS, everyone's performance suffers.",
    category: "Infrastructure",
  },
  {
    term: "Container",
    definition:
      "A lightweight, isolated environment that packages an application with everything it needs to run. Containers are more efficient than full VPS but share the host's operating system.",
    example:
      "Docker containers let you run apps consistently across development and production.",
    category: "Infrastructure",
  },
  {
    term: "Latency",
    definition:
      "The time delay between a request and response, often measured in milliseconds (ms). Lower latency means faster response times for your users. Server location affects latency significantly.",
    example:
      "A server in New York will have lower latency for US East Coast users than one in Singapore.",
    category: "Network",
  },
  {
    term: "Burstable vs Dedicated",
    definition:
      "Burstable resources can temporarily exceed your allocation when available, but aren't guaranteed. Dedicated resources are always reserved for you, ensuring consistent performance.",
    example:
      "A burstable 2-core VPS might perform like 4 cores briefly, but can drop to 1 core when the node is busy.",
    category: "Resources",
  },
  {
    term: "IOPS (Input/Output Operations)",
    definition:
      "A measure of how many read/write operations your storage can handle per second. Higher IOPS means faster database queries and file operations.",
    example:
      "A database-heavy application needs high IOPS; a simple static site needs very few.",
    category: "Resources",
  },
  {
    term: "DDoS Protection",
    definition:
      "Defense against Distributed Denial of Service attacks, where attackers flood your server with traffic to make it unavailable. Good protection filters malicious traffic without affecting legitimate users.",
    example:
      "Basic DDoS protection blocks common attack patterns; advanced protection handles sophisticated multi-vector attacks.",
    category: "Security",
  },
  {
    term: "Firewall",
    definition:
      "A security system that monitors and controls incoming and outgoing network traffic based on rules you define. It acts as a barrier between your server and potential threats from the internet.",
    example:
      "You might allow traffic only on ports 80 (HTTP) and 443 (HTTPS) while blocking all other incoming connections.",
    category: "Security",
  },
  {
    term: "SSH (Secure Shell)",
    definition:
      "A secure protocol for remotely accessing and managing your server via command line. SSH encrypts all communication, making it safe to send commands and transfer files over the internet.",
    example:
      "You use SSH to connect to your server from your laptop to install software or view logs.",
    category: "Security",
  },
  {
    term: "SSL/TLS Certificate",
    definition:
      "A digital certificate that encrypts data between your server and visitors' browsers, shown as the padlock icon and 'https' in browser address bars. Essential for security and user trust.",
    example:
      "Let's Encrypt provides free SSL certificates that auto-renew every 90 days.",
    category: "Security",
  },
  {
    term: "IPv4 / IPv6",
    definition:
      "Internet Protocol addresses that identify your server on the internet. IPv4 addresses (like 192.168.1.1) are running out, while IPv6 provides virtually unlimited addresses with a longer format.",
    example:
      "Your VPS might have one IPv4 address and multiple IPv6 addresses included.",
    category: "Network",
  },
  {
    term: "DNS (Domain Name System)",
    definition:
      "The internet's phone book that translates human-readable domain names (like example.com) into IP addresses that computers use. DNS records tell browsers where to find your server.",
    example:
      "An 'A record' points your domain to your server's IPv4 address; a 'CNAME' creates an alias.",
    category: "Network",
  },
  {
    term: "Load Balancer",
    definition:
      "A system that distributes incoming traffic across multiple servers to prevent any single server from being overwhelmed. Improves reliability and allows your application to scale.",
    example:
      "If one server fails, the load balancer automatically routes traffic to healthy servers.",
    category: "Infrastructure",
  },
  {
    term: "Reverse Proxy",
    definition:
      "A server that sits between users and your application servers, forwarding requests and responses. Can provide caching, SSL termination, and additional security layers.",
    example:
      "Nginx or Caddy can act as a reverse proxy, handling HTTPS while your app runs on HTTP internally.",
    category: "Infrastructure",
  },
  {
    term: "Backup & Snapshot",
    definition:
      "A backup is a copy of your data stored separately for recovery. A snapshot is a point-in-time image of your entire server state that can be restored instantly.",
    example:
      "Daily backups protect your data; snapshots let you restore your entire server to yesterday's state in minutes.",
    category: "Reliability",
  },
  {
    term: "Data Center / Region",
    definition:
      "The physical facility where servers are housed, with redundant power, cooling, and network connections. Choosing a region close to your users reduces latency.",
    example:
      "Hosting in Frankfurt serves European users faster than a server in New York.",
    category: "Infrastructure",
  },
  {
    term: "Egress / Ingress",
    definition:
      "Egress is data leaving your server (downloads, responses to users). Ingress is data coming in (uploads, requests). Many providers charge extra for egress beyond a certain limit.",
    example:
      "Streaming video to users consumes high egress bandwidth; uploading files uses ingress.",
    category: "Network",
  },
  {
    term: "Hypervisor",
    definition:
      "Software that creates and manages virtual machines on physical hardware. It allocates resources and ensures each VPS is isolated from others on the same host.",
    example:
      "KVM and VMware are common hypervisors; KVM is open-source and widely used for VPS hosting.",
    category: "Infrastructure",
  },
  {
    term: "Root Access",
    definition:
      "Full administrative control over your server, allowing you to install any software, modify system settings, and access all files. With great power comes great responsibility.",
    example:
      "Root access lets you install custom software, but also means you're responsible for security updates.",
    category: "Security",
  },
  {
    term: "Managed vs Unmanaged",
    definition:
      "Managed hosting means the provider handles server maintenance, updates, and security. Unmanaged means you're responsible for everything—usually cheaper but requires technical knowledge.",
    example:
      "Choose managed if you want to focus on your app; unmanaged if you want full control and lower costs.",
    category: "Infrastructure",
  },
  {
    term: "CDN (Content Delivery Network)",
    definition:
      "A global network of servers that cache and deliver your content from locations close to users. Reduces load on your main server and speeds up delivery of static assets.",
    example:
      "Images hosted on a CDN load from a server in Tokyo for Japanese users, New York for US users.",
    category: "Network",
  },
  {
    term: "Rate Limiting",
    definition:
      "Controlling how many requests a user or IP can make in a given time period. Protects your server from abuse, brute force attacks, and ensures fair resource usage.",
    example:
      "Limiting login attempts to 5 per minute prevents password guessing attacks.",
    category: "Security",
  },
  {
    term: "Cron Job",
    definition:
      "A scheduled task that runs automatically at specified times or intervals. Used for maintenance tasks, backups, sending emails, or any recurring automated work.",
    example:
      "A cron job might clear temporary files every night at 3 AM or send weekly report emails.",
    category: "Infrastructure",
  },
  {
    term: "Port",
    definition:
      "A numbered endpoint for network communication. Different services use different ports—web servers typically use 80 (HTTP) and 443 (HTTPS), while databases use ports like 5432 (PostgreSQL).",
    example:
      "If your app runs on port 3000, you might use a reverse proxy to forward traffic from port 443.",
    category: "Network",
  },
];

const categories = [
  "All",
  "Infrastructure",
  "Resources",
  "Network",
  "Security",
  "Reliability",
];

export default function GlossaryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const filteredTerms = glossaryTerms.filter((item) => {
    const matchesSearch =
      item.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.definition.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="border-b border-border/50 py-12 sm:py-16 md:py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-4 inline-flex items-center justify-center rounded-full bg-primary/10 p-3">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
              Hosting Glossary
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-pretty text-base text-muted-foreground sm:mt-6 sm:text-lg">
              New to hosting? Click on any term below to learn what it means in
              plain language.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Search and Filter */}
      <section className="border-b border-border/50 py-6 sm:py-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Search */}
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search terms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-border bg-card py-2.5 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm ${
                    selectedCategory === category
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Glossary Terms */}
      <section className="py-12 sm:py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          {filteredTerms.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTerms.map((item, index) => (
                <GlossaryTerm
                  key={item.term}
                  term={item.term}
                  definition={item.definition}
                  example={item.example}
                  category={item.category}
                  delay={index * 0.03}
                />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">
                No terms found matching your search.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/50 py-12 sm:py-16">
        <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h3 className="text-xl font-semibold sm:text-2xl">
              Common misconceptions?
            </h3>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              Learn about the myths that hosting providers exploit.
            </p>
            <Link
              href="/myths"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] sm:px-6 sm:py-3"
            >
              Explore Myths
              <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </div>
      </section>
    </PublicLayout>
  );
}

function GlossaryTerm({
  term,
  definition,
  example,
  category,
  delay,
}: {
  term: string;
  definition: string;
  example: string;
  category: string;
  delay: number;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/50 hover:bg-card/80 sm:p-5"
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {category}
          </span>
          <motion.div
            animate={{ rotate: isExpanded ? 45 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <HelpCircle className="h-4 w-4 text-primary" />
          </motion.div>
        </div>
        <h3 className="text-sm font-semibold text-foreground sm:text-base">
          {term}
        </h3>
        <motion.div
          initial={false}
          animate={{
            height: isExpanded ? "auto" : 0,
            opacity: isExpanded ? 1 : 0,
            marginTop: isExpanded ? 12 : 0,
          }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden"
        >
          <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {definition}
          </p>
          <div className="mt-3 rounded-lg bg-muted/50 p-2.5 sm:p-3">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Example:</span>{" "}
              {example}
            </p>
          </div>
        </motion.div>
      </button>
    </motion.div>
  );
}
