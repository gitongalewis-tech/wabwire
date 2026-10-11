import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1').replace(/\/$/, '')

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl, credentials: 'include' }),
  keepUnusedDataFor: 60,
  endpoints: builder => ({
    getEvents: builder.query({ query: () => '/events' }),
  }),
})

export const { useGetEventsQuery } = apiSlice
