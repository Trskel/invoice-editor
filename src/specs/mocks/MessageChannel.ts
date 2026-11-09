// jsdom has no MessageChannel, which antd's Select uses to defer opening and
// closing its popup by one macro task. A timer of 0 ms has the same effect.
class MessageChannelMock {
  port1: { onmessage: ((event: { data: unknown }) => void) | null } = {
    onmessage: null,
  }
  port2 = {
    postMessage: (data: unknown) => {
      setTimeout(() => this.port1.onmessage?.({ data }), 0)
    },
  }
}

global.MessageChannel = MessageChannelMock as unknown as typeof MessageChannel
