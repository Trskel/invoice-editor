import { setupServer } from 'msw/node'
import definition from '../../api/gen/schema.json'
import { delay, http, HttpResponse, JsonBodyType } from 'msw'

export const server = setupServer()
export const serverBaseURL = 'https://jean-test-api.herokuapp.com'

type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options'

const httpMethods: HttpMethod[] = [
  'get',
  'post',
  'put',
  'delete',
  'patch',
  'options',
]

const isHttpMethod = (method: string): method is HttpMethod => {
  return httpMethods.includes(method as HttpMethod)
}

const getEndpointConfiguration = (
  endpointName: string
): { path: string; method: HttpMethod } => {
  let foundPath: string | undefined
  let foundMethod: string | undefined

  if (definition && definition.paths) {
    for (const [path, methods] of Object.entries(definition.paths)) {
      for (const [method, operation] of Object.entries<{
        operationId?: string
      }>(methods)) {
        if (operation.operationId === endpointName) {
          foundPath = path
          foundMethod = method
          break
        }
      }
      if (foundPath) break
    }
  }

  if (!foundPath || !foundMethod) {
    throw new Error(`Endpoint "${endpointName}" not found in schema`)
  }

  if (!isHttpMethod(foundMethod)) {
    throw new Error(`Method "${foundMethod}" not found in schema`)
  }

  return { path: foundPath, method: foundMethod }
}

const buildUrl = (
  path: string,
  params?: {
    pathParams?: Record<string, string>
    queryParams?: Record<string, string>
  }
) => {
  let url = path
  url = url.replace(/{(\w+)}/g, (match, key) => {
    if (params && params.pathParams?.[key]) {
      return params.pathParams[key]
    }
    throw new Error(`Path parameter "${key}" not found in path "${path}"`)
  })
  if (params && params.queryParams) {
    url = url.concat(
      `?${Object.entries(params.queryParams)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join('&')}`
    )
  }
  return serverBaseURL + url
}

// Returns the requests received by the mock, so that a test can check their
// query parameters (the mock matches the path only, whatever the query string).
export const mockEndpoint = ({
  endpointName,
  params,
  response,
  status = 200,
  delay: responseDelay,
}: {
  endpointName: string
  params?: {
    pathParams?: Record<string, string>
    queryParams?: Record<string, string>
  }
  // A function builds the response from the request (for example from its
  // query parameters).
  response: JsonBodyType | ((request: Request) => JsonBodyType)
  status?: number
  // 'infinite' keeps the request pending for the rest of the test.
  delay?: number | 'infinite'
}): Request[] => {
  const endpointConfiguration = getEndpointConfiguration(endpointName)
  const url = buildUrl(endpointConfiguration.path, params)
  const requests: Request[] = []
  server.use(
    http[endpointConfiguration.method](url, async ({ request }) => {
      requests.push(request)
      if (responseDelay !== undefined) await delay(responseDelay)
      const body = typeof response === 'function' ? response(request) : response
      return HttpResponse.json(body, { status })
    })
  )
  return requests
}
