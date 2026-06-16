import { getUriWithOrg } from '@services/config/config'

export const RequestBody = (method: string, data: any, next: any) => {
  let HeadersConfig = new Headers({ 'Content-Type': 'application/json' })
  let options: any = {
    method: method,
    headers: HeadersConfig,
    redirect: 'follow',
    credentials: 'include',
    // Next.js
    next: next,
  }
  if (data) {
    options.body = JSON.stringify(data)
  }
  return options
}

export const RequestBodyWithAuthHeader = (
  method: string,
  data: any,
  next: any,
  token?: string
) => {
  const headersObj: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headersObj['Authorization'] = `Bearer ${token}`
  }
  if (typeof window === 'undefined') {
    headersObj['User-Agent'] = 'LearnHouse-Server/1.0'
  }

  let HeadersConfig = new Headers(headersObj)
  let options: any = {
    method: method,
    headers: HeadersConfig,
    redirect: 'follow',
    credentials: 'include',
    body:
      (method === 'POST' ||
        method === 'PUT' ||
        method === 'PATCH' ||
        method === 'DELETE') &&
      data !== null
        ? JSON.stringify(data)
        : null,
    // Next.js
    next: next,
  }
  return options
}

export const RequestBodyForm = (method: string, data: any, next: any) => {
  let HeadersConfig = new Headers({})
  let options: any = {
    method: method,
    headers: HeadersConfig,
    redirect: 'follow',
    credentials: 'include',
    body: method === 'POST' || method === 'PUT' ? JSON.stringify(data) : null,
    // Next.js
    next: next,
  }
  return options
}

export const RequestBodyFormWithAuthHeader = (
  method: string,
  data: any,
  next: any,
  access_token: string
) => {
  let HeadersConfig = new Headers({
    Authorization: `Bearer ${access_token}`,
  })
  let options: any = {
    method: method,
    headers: HeadersConfig,
    redirect: 'follow',
    credentials: 'include',
    body: data,
    // Next.js
    next: next,
  }
  return options
}

export const swrFetcher = async (url: string, token?: string) => {
  // Create the request options
  let HeadersConfig = new Headers(
    token
      ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      : { 'Content-Type': 'application/json' }
  )
  let options: any = {
    method: 'GET',
    headers: HeadersConfig,
    redirect: 'follow',
    credentials: 'include',
  }

  // Fetch the data
  const request = await fetch(url, options)
  const res = await errorHandling(request)

  // Return the data
  return res
}

export const errorHandling = async (res: any) => {
  if (!res.ok) {
    let errorText = ''
    try {
      errorText = await res.text()
    } catch (e) {
      // Ignore text parsing errors
    }
    // eslint-disable-next-line no-console
    console.error(`API Error ${res.status} ${res.statusText}:`, errorText)
    const error: any = new Error(`${res.statusText}`)
    error.status = res.status
    error.body = errorText
    throw error
  }
  const text = await res.text()
  try {
    return text ? JSON.parse(text) : {}
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to parse JSON in errorHandling:', text)
    return {}
  }
}

type CustomResponseTyping = {
  success: boolean
  data: any
  status: number
  HTTPmessage: string
}

export const getResponseMetadata = async (
  fetch_result: any
): Promise<CustomResponseTyping> => {
  let json = {}
  try {
    const text = await fetch_result.text()
    json = text ? JSON.parse(text) : {}
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to parse JSON in getResponseMetadata:', e)
    json = { detail: 'Invalid JSON response from server' }
  }

  if (fetch_result.status === 200 || fetch_result.status === 201) {
    return {
      success: true,
      data: json,
      status: fetch_result.status,
      HTTPmessage: fetch_result.statusText,
    }
  } else {
    return {
      success: false,
      data: json,
      status: fetch_result.status,
      HTTPmessage: fetch_result.statusText,
    }
  }
}

export const revalidateTags = async (tags: string[], orgslug: string) => {
  const url = getUriWithOrg(orgslug, '')
  tags.forEach((tag) => {
    fetch(`${url}/api/revalidate?tag=${tag}`)
  })
}
