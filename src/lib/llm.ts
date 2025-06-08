import ollama, { Message } from 'ollama'

export class LLM {
  private model = ''
  private systemPrompt = ''
  private listeners: (() => void)[] = []
  private history: Message[] = []

  constructor(model?: string, systemPrompt?: string) {
    this.model = model || 'llama3.2'
    this.systemPrompt =
      systemPrompt || 'You are a helpful assistant that responds in markdown.'
  }

  subscribe(listener: () => void) {
    this.listeners = [...this.listeners, listener]
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener())
  }

  getSnapshot() {
    return this.history
  }

  async *sendMessage(message: string) {
    this.history.push({ role: 'user', content: message })
    this.notifyListeners()

    const stream = await ollama.chat({
      model: this.model,
      messages: [
        { role: 'system', content: this.systemPrompt },
        ...this.history
      ],
      stream: true
    })

    let responseMessage = ''
    for await (const part of stream) {
      responseMessage += part.message.content
      yield part.message.content
    }

    this.history.push({ role: 'assistant', content: responseMessage })
    this.notifyListeners()
  }
}
