import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

const configuredBaseUrl = import.meta.env.VITE_API_URL
const baseUrl = (import.meta.env.PROD ? (configuredBaseUrl?.startsWith('/') ? configuredBaseUrl : '/api/v1') : configuredBaseUrl || 'http://localhost:4000/api/v1').replace(/\/$/, '')

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl, credentials: 'include' }),
  keepUnusedDataFor: 60,
  endpoints: builder => ({
    getEvents: builder.query({ query: () => '/events' }),
    getMemberOverview: builder.query({ query: () => '/dashboard/summary', keepUnusedDataFor: 90 }),
    getAdminOverview: builder.query({ query: () => '/admin/overview', keepUnusedDataFor: 90 }),
  }),
})

export const { useGetEventsQuery, useGetMemberOverviewQuery, useGetAdminOverviewQuery } = apiSlice
