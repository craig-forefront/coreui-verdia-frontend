// Test file (run this separately in your environment)
import { QdrantClient } from '@qdrant/js-client-rest'
const client = new QdrantClient({ url: 'http://localhost:6333' })

const collections = await client.getCollections();
console.log(collections);

async function testSearch() {
  try {
    const response = await client.search(
      "star_charts",{
      vector: [0.05,0.61,0.76,0.74],
      with_payload: true,
      limit: 3
    })
    console.log('Test search response:', response)
  } catch (error) {
    console.error('Test search error:', error)
  }
}
testSearch()