# Pinecone Vector Database & AI Search Implementation Guide

## Overview
Pinecone là vector database service chuyên dụng cho AI applications, cung cấp semantic search, similarity search, và vector operations ở quy mô lớn.

## 1. Setup Account

### Bước 1: Tạo Pinecone Account
1. Truy cập [pinecone.io](https://pinecone.io)
2. Sign up/Sign in
3. Create new project:
   - Project name: `my-ai-app`
   - Environment: `production` hoặc `development`
4. Create index:
   - Index name: `documents`
   - Dimension: 1536 (cho OpenAI embeddings)
   - Metric: `cosine`
   - Pod type: `p1.x1` (starter)

### Bước 2: Get API Key
```bash
# Environment variables
PINECONE_API_KEY=your-api-key
PINECONE_ENVIRONMENT=your-environment-name
PINECONE_INDEX_NAME=documents
```

## 2. Installation

### Node.js SDK
```bash
npm install @pinecone-database/pinecone
# hoặc
yarn add @pinecone-database/pinecone
```

### Python SDK
```bash
pip install pinecone-client
# hoặc
pip install pinecone
```

## 3. Basic Setup

### Initialize Pinecone
```javascript
// lib/pinecone.js
import { Pinecone } from '@pinecone-database/pinecone'

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
  environment: process.env.PINECONE_ENVIRONMENT
})

export const pineconeIndex = pinecone.index(process.env.PINECONE_INDEX_NAME)

export default pinecone
```

### Index Operations
```javascript
// app/api/pinecone.js
import { pineconeIndex } from '@/lib/pinecone'

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { vectors, metadata } = req.body
    
    try {
      // Upsert vectors
      const result = await pineconeIndex.upsert([
        {
          id: 'doc1',
          values: vectors,
          metadata: metadata
        }
      ])
      
      return res.json({ success: true, upsertedCount: result.upsertedCount })
    } catch (error) {
      return res.status(500).json({ error: error.message })
    }
  }
  
  if (req.method === 'GET') {
    const { queryVector, topK = 5 } = req.query
    
    try {
      // Query similar vectors
      const results = await pineconeIndex.query({
        vector: JSON.parse(queryVector),
        topK: parseInt(topK),
        includeMetadata: true
      })
      
      return res.json(results)
    } catch (error) {
      return res.status(500).json({ error: error.message })
    }
  }
}
```

## 4. Text Embeddings

### OpenAI Integration
```javascript
// lib/embeddings.js
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text
    })
    
    return response.data[0].embedding
  } catch (error) {
    console.error('Error generating embedding:', error)
    throw error
  }
}

export async function generateBatchEmbeddings(texts) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: texts
    })
    
    return response.data.map(item => item.embedding)
  } catch (error) {
    console.error('Error generating batch embeddings:', error)
    throw error
  }
}
```

### Alternative Embedding Services
```javascript
// Using Cohere
import { CohereClient } from 'cohere-ai'

const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY
})

export async function generateCohereEmbedding(text) {
  const response = await cohere.embed({
    texts: [text],
    model: 'embed-english-v3.0'
  })
  
  return response.embeddings[0]
}

// Using Hugging Face
import { HfInference } from '@huggingface/inference'

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY)

export async function generateHuggingFaceEmbedding(text) {
  const response = await hf.featureExtraction({
    model: 'sentence-transformers/all-MiniLM-L6-v2',
    inputs: text
  })
  
  return response
}
```

## 5. Document Management

### Document Indexing
```javascript
// lib/document-manager.js
import { pineconeIndex } from '@/lib/pinecone'
import { generateEmbedding } from './embeddings'

class DocumentManager {
  constructor() {
    this.batchSize = 100
  }

  async indexDocument(document) {
    try {
      // Generate embedding for document content
      const embedding = await generateEmbedding(document.content)
      
      // Prepare vector data
      const vectorData = {
        id: document.id,
        values: embedding,
        metadata: {
          title: document.title,
          content: document.content.substring(0, 1000), // Truncate for metadata
          url: document.url,
          category: document.category,
          tags: document.tags,
          createdAt: document.createdAt,
          updatedAt: document.updatedAt
        }
      }
      
      // Upsert to Pinecone
      await pineconeIndex.upsert([vectorData])
      
      return { success: true, id: document.id }
    } catch (error) {
      console.error('Error indexing document:', error)
      throw error
    }
  }

  async indexBatchDocuments(documents) {
    const vectors = []
    
    for (const document of documents) {
      try {
        const embedding = await generateEmbedding(document.content)
        
        vectors.push({
          id: document.id,
          values: embedding,
          metadata: {
            title: document.title,
            content: document.content.substring(0, 1000),
            url: document.url,
            category: document.category,
            tags: document.tags,
            createdAt: document.createdAt,
            updatedAt: document.updatedAt
          }
        })
      } catch (error) {
        console.error(`Error embedding document ${document.id}:`, error)
      }
    }
    
    // Batch upsert
    if (vectors.length > 0) {
      await pineconeIndex.upsert(vectors)
    }
    
    return { 
      success: true, 
      processed: vectors.length, 
      total: documents.length 
    }
  }

  async updateDocument(documentId, updates) {
    try {
      // Fetch existing vector
      const fetchResult = await pineconeIndex.fetch([documentId])
      const existingVector = fetchResult.vectors[0]
      
      if (!existingVector) {
        throw new Error(`Document ${documentId} not found`)
      }
      
      // Update metadata
      const updatedMetadata = { ...existingVector.metadata, ...updates }
      
      // Regenerate embedding if content changed
      let embedding = existingVector.values
      if (updates.content) {
        embedding = await generateEmbedding(updates.content)
      }
      
      await pineconeIndex.upsert([{
        id: documentId,
        values: embedding,
        metadata: updatedMetadata
      }])
      
      return { success: true }
    } catch (error) {
      console.error('Error updating document:', error)
      throw error
    }
  }

  async deleteDocument(documentId) {
    try {
      await pineconeIndex.deleteOne(documentId)
      return { success: true }
    } catch (error) {
      console.error('Error deleting document:', error)
      throw error
    }
  }

  async searchDocuments(query, options = {}) {
    try {
      // Generate embedding for query
      const queryEmbedding = await generateEmbedding(query)
      
      // Search parameters
      const searchParams = {
        vector: queryEmbedding,
        topK: options.topK || 10,
        includeMetadata: true,
        includeValues: false
      }
      
      // Add filter if provided
      if (options.filter) {
        searchParams.filter = options.filter
      }
      
      const results = await pineconeIndex.query(searchParams)
      
      return {
        matches: results.matches.map(match => ({
          id: match.id,
          score: match.score,
          metadata: match.metadata,
          highlights: this.generateHighlights(query, match.metadata)
        })),
        query: query,
        total: results.matches.length
      }
    } catch (error) {
      console.error('Error searching documents:', error)
      throw error
    }
  }

  generateHighlights(query, metadata) {
    const content = metadata.content || ''
    const queryWords = query.toLowerCase().split(' ')
    
    let highlightedContent = content
    
    queryWords.forEach(word => {
      const regex = new RegExp(`(${word})`, 'gi')
      highlightedContent = highlightedContent.replace(regex, '<mark>$1</mark>')
    })
    
    return highlightedContent.substring(0, 300) + (highlightedContent.length > 300 ? '...' : '')
  }
}

export const documentManager = new DocumentManager()
```

## 6. Semantic Search Implementation

### Advanced Search Features
```javascript
// lib/semantic-search.js
import { documentManager } from './document-manager'

class SemanticSearchEngine {
  constructor() {
    this.defaultOptions = {
      topK: 10,
      threshold: 0.7,
      includeMetadata: true
    }
  }

  async search(query, options = {}) {
    const searchOptions = { ...this.defaultOptions, ...options }
    
    try {
      // Perform semantic search
      const results = await documentManager.searchDocuments(query, searchOptions)
      
      // Post-process results
      return {
        query,
        results: this.processResults(results.matches, searchOptions),
        facets: await this.generateFacets(results.matches),
        suggestions: await this.generateSuggestions(query)
      }
    } catch (error) {
      console.error('Search error:', error)
      throw error
    }
  }

  processResults(matches, options) {
    return matches
      .filter(match => match.score >= (options.threshold || 0.7))
      .map(match => ({
        id: match.id,
        title: match.metadata.title,
        content: match.metadata.content,
        url: match.metadata.url,
        category: match.metadata.category,
        tags: match.metadata.tags,
        score: match.score,
        relevance: this.calculateRelevance(match.score),
        highlights: match.highlights
      }))
      .sort((a, b) => b.score - a.score)
  }

  calculateRelevance(score) {
    if (score >= 0.9) return 'very_high'
    if (score >= 0.8) return 'high'
    if (score >= 0.7) return 'medium'
    if (score >= 0.6) return 'low'
    return 'very_low'
  }

  async generateFacets(matches) {
    const facets = {
      categories: {},
      tags: {}
    }
    
    matches.forEach(match => {
      const metadata = match.metadata
      
      // Count categories
      if (metadata.category) {
        facets.categories[metadata.category] = (facets.categories[metadata.category] || 0) + 1
      }
      
      // Count tags
      if (metadata.tags) {
        metadata.tags.forEach(tag => {
          facets.tags[tag] = (facets.tags[tag] || 0) + 1
        })
      }
    })
    
    return facets
  }

  async generateSuggestions(query) {
    // Simple suggestion logic - can be enhanced with ML
    const suggestions = []
    
    // Common typos and corrections
    const corrections = {
      'javascrpt': 'javascript',
      'reactjs': 'react',
      'nodejs': 'node.js'
    }
    
    const correctedQuery = corrections[query.toLowerCase()]
    if (correctedQuery) {
      suggestions.push({
        type: 'correction',
        text: correctedQuery,
        description: `Did you mean "${correctedQuery}"?`
      })
    }
    
    // Popular related searches
    const relatedSearches = await this.getRelatedSearches(query)
    relatedSearches.forEach(related => {
      suggestions.push({
        type: 'related',
        text: related,
        description: `Related: ${related}`
      })
    })
    
    return suggestions.slice(0, 5)
  }

  async getRelatedSearches(query) {
    // This would typically come from analytics data
    // For now, return some hardcoded examples
    const relatedMap = {
      'javascript': ['react', 'vue', 'angular', 'node.js'],
      'react': ['hooks', 'components', 'state management'],
      'node.js': ['express', 'mongodb', 'api']
    }
    
    return relatedMap[query.toLowerCase()] || []
  }
}

export const semanticSearch = new SemanticSearchEngine()
```

## 7. Hybrid Search

### Combining Semantic and Keyword Search
```javascript
// lib/hybrid-search.js
import { documentManager } from './document-manager'

class HybridSearchEngine {
  constructor() {
    this.weights = {
      semantic: 0.7,
      keyword: 0.3
    }
  }

  async search(query, options = {}) {
    try {
      // Parallel search
      const [semanticResults, keywordResults] = await Promise.all([
        this.semanticSearch(query, options),
        this.keywordSearch(query, options)
      ])
      
      // Combine and re-rank results
      const combinedResults = this.combineResults(
        semanticResults,
        keywordResults,
        query
      )
      
      return {
        query,
        results: combinedResults,
        semanticCount: semanticResults.length,
        keywordCount: keywordResults.length
      }
    } catch (error) {
      console.error('Hybrid search error:', error)
      throw error
    }
  }

  async semanticSearch(query, options) {
    const results = await documentManager.searchDocuments(query, {
      topK: options.topK || 20,
      threshold: options.semanticThreshold || 0.6
    })
    
    return results.matches.map(match => ({
      ...match,
      source: 'semantic',
      score: match.score * this.weights.semantic
    }))
  }

  async keywordSearch(query, options) {
    // Implement keyword-based search
    // This could use traditional search engines or database queries
    
    // For demo purposes, return empty results
    // In production, you'd integrate with Elasticsearch, Algolia, etc.
    return []
  }

  combineResults(semanticResults, keywordResults, query) {
    const combined = new Map()
    
    // Add semantic results
    semanticResults.forEach(result => {
      combined.set(result.id, {
        ...result,
        combinedScore: result.score
      })
    })
    
    // Add or update with keyword results
    keywordResults.forEach(result => {
      if (combined.has(result.id)) {
        const existing = combined.get(result.id)
        existing.combinedScore += result.score
        existing.sources = [...(existing.sources || []), result.source]
      } else {
        combined.set(result.id, {
          ...result,
          combinedScore: result.score,
          sources: [result.source]
        })
      }
    })
    
    // Convert to array and sort by combined score
    return Array.from(combined.values())
      .sort((a, b) => b.combinedScore - a.combinedScore)
      .slice(0, 10) // Top 10 results
  }
}

export const hybridSearch = new HybridSearchEngine()
```

## 8. Question Answering with RAG

### RAG (Retrieval-Augmented Generation)
```javascript
// lib/rag-system.js
import { documentManager } from './document-manager'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

class RAGSystem {
  constructor() {
    this.maxContextLength = 4000
    this.maxRetrievedDocs = 5
  }

  async answerQuestion(question, options = {}) {
    try {
      // Step 1: Retrieve relevant documents
      const retrievedDocs = await this.retrieveDocuments(question, options)
      
      // Step 2: Build context
      const context = this.buildContext(retrievedDocs, question)
      
      // Step 3: Generate answer
      const answer = await this.generateAnswer(question, context, options)
      
      return {
        question,
        answer,
        sources: retrievedDocs.map(doc => ({
          id: doc.id,
          title: doc.metadata.title,
          url: doc.metadata.url,
          score: doc.score
        })),
        context: context,
        retrievedCount: retrievedDocs.length
      }
    } catch (error) {
      console.error('RAG error:', error)
      throw error
    }
  }

  async retrieveDocuments(question, options = {}) {
    // Search for relevant documents
    const searchResults = await documentManager.searchDocuments(question, {
      topK: this.maxRetrievedDocs,
      threshold: options.threshold || 0.7
    })
    
    return searchResults.matches
  }

  buildContext(documents, question) {
    let context = "Based on the following documents:\n\n"
    
    documents.forEach((doc, index) => {
      context += `Document ${index + 1}:\n`
      context += `Title: ${doc.metadata.title}\n`
      context += `Content: ${doc.metadata.content}\n`
      context += `Source: ${doc.metadata.url}\n\n`
    })
    
    context += `\nQuestion: ${question}\n\n`
    context += "Please answer the question based on the provided documents. "
    context += "If the documents don't contain the answer, say so clearly. "
    context += "Always cite your sources using the document numbers."
    
    // Truncate if too long
    if (context.length > this.maxContextLength) {
      context = context.substring(0, this.maxContextLength - 100) + "..."
    }
    
    return context
  }

  async generateAnswer(question, context, options = {}) {
    const prompt = `${context}\n\nAnswer:`
    
    try {
      const response = await openai.chat.completions.create({
        model: options.model || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that answers questions based on provided documents. Always be accurate and cite your sources.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: options.maxTokens || 500,
        temperature: options.temperature || 0.1
      })
      
      return response.choices[0].message.content
    } catch (error) {
      console.error('Error generating answer:', error)
      throw error
    }
  }

  async chatWithHistory(messages, options = {}) {
    try {
      const lastMessage = messages[messages.length - 1]
      const contextMessages = messages.slice(0, -1)
      
      // Retrieve relevant documents for the latest question
      const retrievedDocs = await this.retrieveDocuments(lastMessage.content, options)
      const context = this.buildContext(retrievedDocs, lastMessage.content)
      
      // Build messages for OpenAI
      const openaiMessages = [
        {
          role: 'system',
          content: 'You are a helpful assistant. Use the provided context to answer questions accurately.'
        },
        ...contextMessages,
        {
          role: 'system',
          content: context
        },
        lastMessage
      ]
      
      const response = await openai.chat.completions.create({
        model: options.model || 'gpt-3.5-turbo',
        messages: openaiMessages,
        max_tokens: options.maxTokens || 500,
        temperature: options.temperature || 0.1
      })
      
      return {
        answer: response.choices[0].message.content,
        sources: retrievedDocs.map(doc => ({
          id: doc.id,
          title: doc.metadata.title,
          url: doc.metadata.url,
          score: doc.score
        }))
      }
    } catch (error) {
      console.error('Chat error:', error)
      throw error
    }
  }
}

export const ragSystem = new RAGSystem()
```

## 9. API Implementation

### Complete Search API
```javascript
// app/api/search.js
import { semanticSearch } from '@/lib/semantic-search'
import { hybridSearch } from '@/lib/hybrid-search'
import { ragSystem } from '@/lib/rag-system'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { 
    q: query, 
    type = 'semantic',
    topK = 10,
    threshold = 0.7,
    answer = false 
  } = req.query

  if (!query) {
    return res.status(400).json({ error: 'Query parameter is required' })
  }

  try {
    let result

    switch (type) {
      case 'semantic':
        result = await semanticSearch.search(query, { 
          topK: parseInt(topK), 
          threshold: parseFloat(threshold) 
        })
        break

      case 'hybrid':
        result = await hybridSearch.search(query, { 
          topK: parseInt(topK), 
          threshold: parseFloat(threshold) 
        })
        break

      case 'rag':
        result = await ragSystem.answerQuestion(query, { 
          threshold: parseFloat(threshold) 
        })
        break

      default:
        return res.status(400).json({ error: 'Invalid search type' })
    }

    res.json(result)
  } catch (error) {
    console.error('Search API error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
```

## 10. Performance Optimization

### Batch Operations
```javascript
// lib/batch-operations.js
import { pineconeIndex } from '@/lib/pinecone'

class BatchProcessor {
  constructor() {
    this.batchSize = 100
    this.maxConcurrency = 5
  }

  async batchUpsert(vectors) {
    const batches = this.createBatches(vectors, this.batchSize)
    const results = []
    
    // Process batches concurrently
    const semaphore = new Semaphore(this.maxConcurrency)
    
    const promises = batches.map(async (batch) => {
      await semaphore.acquire()
      
      try {
        const result = await pineconeIndex.upsert(batch)
        results.push(result)
        return result
      } finally {
        semaphore.release()
      }
    })
    
    await Promise.all(promises)
    
    return {
      totalProcessed: vectors.length,
      batchCount: batches.length,
      results
    }
  }

  createBatches(array, batchSize) {
    const batches = []
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize))
    }
    return batches
  }
}

// Simple semaphore implementation
class Semaphore {
  constructor(maxConcurrency) {
    this.maxConcurrency = maxConcurrency
    this.currentConcurrency = 0
    this.queue = []
  }

  async acquire() {
    return new Promise((resolve) => {
      if (this.currentConcurrency < this.maxConcurrency) {
        this.currentConcurrency++
        resolve()
      } else {
        this.queue.push(resolve)
      }
    })
  }

  release() {
    this.currentConcurrency--
    if (this.queue.length > 0) {
      const next = this.queue.shift()
      this.currentConcurrency++
      next()
    }
  }
}

export const batchProcessor = new BatchProcessor()
```

### Caching Layer
```javascript
// lib/vector-cache.js
import redis from '@/lib/upstash-redis'

class VectorCache {
  constructor() {
    this.ttl = 3600 // 1 hour
  }

  async getCachedEmbedding(text) {
    const key = `embedding:${this.hashText(text)}`
    const cached = await redis.get(key)
    return cached ? JSON.parse(cached) : null
  }

  async cacheEmbedding(text, embedding) {
    const key = `embedding:${this.hashText(text)}`
    await redis.set(key, JSON.stringify(embedding), { ex: this.ttl })
  }

  async getCachedSearch(query, options) {
    const key = `search:${this.hashText(query)}:${JSON.stringify(options)}`
    const cached = await redis.get(key)
    return cached ? JSON.parse(cached) : null
  }

  async cacheSearch(query, options, results) {
    const key = `search:${this.hashText(query)}:${JSON.stringify(options)}`
    await redis.set(key, JSON.stringify(results), { ex: this.ttl })
  }

  hashText(text) {
    // Simple hash function - use crypto in production
    return text.split('').reduce((hash, char) => {
      hash = ((hash << 5) - hash) + char.charCodeAt(0)
      return hash & hash
    }, 0)
  }
}

export const vectorCache = new VectorCache()
```

## 11. Monitoring & Analytics

### Search Analytics
```javascript
// lib/search-analytics.js
import redis from '@/lib/upstash-redis'

class SearchAnalytics {
  constructor() {
    this.analyticsKey = 'search:analytics'
  }

  async trackSearch(query, results, userId = null) {
    const analyticsData = {
      query,
      resultCount: results.length,
      timestamp: Date.now(),
      userId,
      userAgent: this.getUserAgent(),
      ip: this.getClientIP()
    }

    // Store in Redis list
    await redis.lpush(this.analyticsKey, JSON.stringify(analyticsData))
    
    // Keep only last 10000 searches
    await redis.ltrim(this.analyticsKey, 0, 9999)
  }

  async getSearchStats(timeRange = 24 * 60 * 60 * 1000) { // 24 hours
    const searches = await this.getRecentSearches(timeRange)
    
    const stats = {
      totalSearches: searches.length,
      uniqueQueries: new Set(searches.map(s => s.query)).size,
      averageResultCount: searches.reduce((sum, s) => sum + s.resultCount, 0) / searches.length,
      topQueries: this.getTopQueries(searches),
      searchFrequency: this.getSearchFrequency(searches)
    }

    return stats
  }

  async getRecentSearches(timeRange) {
    const cutoffTime = Date.now() - timeRange
    const allSearches = await redis.lrange(this.analyticsKey, 0, -1)
    
    return allSearches
      .map(search => JSON.parse(search))
      .filter(search => search.timestamp > cutoffTime)
  }

  getTopQueries(searches, limit = 10) {
    const queryCounts = {}
    
    searches.forEach(search => {
      queryCounts[search.query] = (queryCounts[search.query] || 0) + 1
    })
    
    return Object.entries(queryCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([query, count]) => ({ query, count }))
  }

  getSearchFrequency(searches) {
    const hourlyBuckets = {}
    
    searches.forEach(search => {
      const hour = new Date(search.timestamp).getHours()
      hourlyBuckets[hour] = (hourlyBuckets[hour] || 0) + 1
    })
    
    return hourlyBuckets
  }

  getUserAgent() {
    // In a real implementation, this would come from the request
    return 'Mozilla/5.0...'
  }

  getClientIP() {
    // In a real implementation, this would come from the request
    return '192.168.1.1'
  }
}

export const searchAnalytics = new SearchAnalytics()
```

## 12. Best Practices

### Vector Quality
```javascript
// Use high-quality embeddings
const embeddingBestPractices = {
  // Use appropriate models
  textModel: 'text-embedding-ada-002',
  codeModel: 'text-embedding-ada-002',
  
  // Preprocess text
  preprocessText: (text) => {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove special chars
      .trim()
  },
  
  // Chunk long documents
  chunkSize: 500,
  chunkOverlap: 50,
  
  // Normalize vectors
  normalize: true
}
```

### Index Management
```javascript
// Index configuration best practices
const indexConfig = {
  // Choose appropriate dimensions
  dimensions: 1536, // OpenAI ada-002
  
  // Choose appropriate metric
  metric: 'cosine', // For semantic similarity
  
  // Configure pods based on usage
  podType: 'p1.x1', // Starter pod
  replicas: 1,        // Scale as needed
  
  // Set up monitoring
  monitorUsage: true,
  
  // Plan for scaling
  autoscale: {
    enabled: true,
    minReplicas: 1,
    maxReplicas: 10
  }
}
```

### Error Handling
```javascript
// Robust error handling
async function safeVectorOperation(operation, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await operation()
    } catch (error) {
      if (i === retries - 1) throw error
      
      // Exponential backoff
      const delay = Math.pow(2, i) * 1000
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
}
```

## 13. Common Use Cases

### Document Search System
```javascript
// Complete document search implementation
const documentSearch = {
  async search(query, filters = {}) {
    // Semantic search with filters
    const results = await semanticSearch.search(query, {
      filter: {
        category: filters.category,
        tags: filters.tags,
        dateRange: filters.dateRange
      }
    })
    
    return results
  },
  
  async addDocument(document) {
    return await documentManager.indexDocument(document)
  },
  
  async updateDocument(id, updates) {
    return await documentManager.updateDocument(id, updates)
  }
}
```

### Recommendation System
```javascript
// Content-based recommendations
class RecommendationEngine {
  async getRecommendations(userId, contentType = 'articles') {
    // Get user's interaction history
    const userHistory = await this.getUserHistory(userId)
    
    // Find similar content based on user preferences
    const recommendations = []
    
    for (const interaction of userHistory) {
      const similar = await semanticSearch.search(interaction.content, {
        topK: 5,
        filter: { type: contentType }
      })
      
      recommendations.push(...similar.results)
    }
    
    // Remove duplicates and rank
    return this.rankRecommendations(recommendations)
  }
  
  rankRecommendations(recommendations) {
    // Remove duplicates
    const unique = recommendations.filter((rec, index, self) => 
      index === self.findIndex(r => r.id === rec.id)
    )
    
    // Sort by relevance score
    return unique.sort((a, b) => b.score - a.score).slice(0, 10)
  }
}
```

## Resources
- [Pinecone Documentation](https://docs.pinecone.io)
- [Pinecone Quickstart](https://docs.pinecone.io/docs/quickstart)
- [Pinecone GitHub](https://github.com/pinecone-io)
- [Vector Database Best Practices](https://docs.pinecone.io/docs/learn)
