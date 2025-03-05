import React, { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchVectorSearchResults } from '../../store/vectorSearchSlice'

const VectorSearch = () => {
  const [vectors, setVectors] = useState('')
  const dispatch = useDispatch()
  const { results, status, error } = useSelector((state) => state.vectorSearch)

  const handleSearch = () => {
    console.log('handleSearch triggered with:', vectors)
    const vectorArray = vectors.split(',').map(Number)
    console.log('Parsed vectors:', vectorArray)
    dispatch(fetchVectorSearchResults(vectorArray))
  }

  return (
    <div>
      <h1>Vector Search</h1>
      <textarea
        value={vectors}
        onChange={(e) => setVectors(e.target.value)}
        placeholder="Enter vectors separated by commas"
      />
      <button onClick={handleSearch}>Search</button>
      {status === 'loading' && <p>Loading...</p>}
      {status === 'succeeded' && (
        <div>
          <h2>Results</h2>
          <ul>
            {results.map((result, index) => (
              <li key={index}>{JSON.stringify(result)}</li>
            ))}
          </ul>
        </div>
      )}
      {status === 'failed' && <p>Error: {error}</p>}
    </div>
  )
}

export default VectorSearch