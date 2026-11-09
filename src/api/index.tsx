import { ReactNode, createContext, useContext, useState } from 'react'
import OpenAPIClientAxios from 'openapi-client-axios'
import { Client } from './gen/client'
import definition from './gen/schema.json'

interface ApiContextState {
  client: Client | undefined
}

const ApiContext = createContext<ApiContextState>({
  client: undefined,
})

interface ApiProviderProps {
  url: string
  token: string
  children?: ReactNode
}

export const ApiProvider: React.FC<ApiProviderProps> = ({
  url,
  token,
  children,
}) => {
  // Lazy initializer: the client is created once, on the first render.
  const [client] = useState(() =>
    new OpenAPIClientAxios({
      // @ts-expect-error The JSON import is typed with plain strings, not the OpenAPI Document literal types.
      definition,
      withServer: { url },
      axiosConfigDefaults: {
        headers: {
          'X-SESSION': token,
        },
      },
    }).initSync<Client>()
  )

  return (
    <ApiContext.Provider value={{ client }}>{children}</ApiContext.Provider>
  )
}

export const useApi = () => {
  const { client } = useContext(ApiContext)

  if (!client) {
    throw new Error('A client API must be defined')
  }

  return client
}
