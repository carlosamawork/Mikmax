import {MetadataRoute} from 'next'
import {buildUrl} from '@/utils/seoHelper'

// AI answer-engine & training crawlers we explicitly welcome for GEO
// (Generative Engine Optimization) visibility. Listed individually so the
// policy is intentional and survives any future tightening of the `*` rule.
const AI_CRAWLERS = [
  'GPTBot', // OpenAI training
  'OAI-SearchBot', // ChatGPT search
  'ChatGPT-User', // ChatGPT browsing on user request
  'PerplexityBot', // Perplexity index
  'Perplexity-User', // Perplexity on user request
  'ClaudeBot', // Anthropic
  'Claude-User',
  'anthropic-ai',
  'Google-Extended', // Gemini / AI Overviews grounding
  'Applebot-Extended', // Apple Intelligence
  'Amazonbot',
  'Bytespider', // TikTok / Doubao
  'Meta-ExternalAgent', // Meta AI
  'CCBot', // Common Crawl (feeds many LLMs)
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {userAgent: '*', allow: '/', disallow: '/admin/'},
      // Same access as everyone else, stated explicitly so AI engines can cite us.
      {userAgent: AI_CRAWLERS, allow: '/', disallow: '/admin/'},
    ],
    sitemap: buildUrl('/sitemap.xml'),
  }
}
