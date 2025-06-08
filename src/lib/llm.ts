import ollama, { Message } from 'ollama'

const systemPrompt = 'You are a helpful assistant that responds in markdown.'

export async function* runModel(messages: Message[]) {
  const stream = await ollama.chat({
    model: 'llama3.2',
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
    stream: true
  })

  for await (const part of stream) {
    yield part.message.content
  }
}
