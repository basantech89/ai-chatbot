import ollama, { ChatRequest } from 'ollama/browser'
import OpenAI from 'openai'
import { playAudio } from 'openai/helpers/audio'
import {
  ResponseCreateParamsStreaming,
  ResponseInput
} from 'openai/resources/responses/responses'
import { ResponsesModel } from 'openai/resources/shared'
import { functions } from './tools'
import { ChatCompletionCreateParamsNonStreaming } from 'openai/resources/index.mjs'

type LLMType = 'OLLAMA' | 'GPT'
type MODEL = ResponsesModel | 'llama3.2' | 'qwen3' | 'mistral'

const openaiKey = import.meta.env.VITE_OPENAI_API_KEY
const openai = new OpenAI({ apiKey: openaiKey, dangerouslyAllowBrowser: true })

export class LLM {
  private model = ''
  private systemPrompt = ''
  private listeners: (() => void)[] = []
  private messages: OpenAI.Responses.EasyInputMessage[] = []

  private history = new Proxy<ResponseInput>([], {
    set: (target, prop, value) => {
      if (value.content) {
        if (!value.role || (!!value.role && value.role !== 'tool')) {
          this.messages.push(value)
        }
      }

      target[prop as unknown as number] = value
      return true
    }
  })

  private type: LLMType

  constructor(type: LLMType = 'OLLAMA', model?: MODEL, systemPrompt?: string) {
    this.type = type
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
    return this.messages
  }

  private async *sendMessageToLlama(
    message: string,
    args: Partial<ChatRequest> = {}
  ) {
    this.history.push({ role: 'user', content: message })
    this.notifyListeners()

    const stream = await ollama.chat({
      model: this.model,
      messages: [
        { role: 'system', content: this.systemPrompt },
        ...this.history
      ],
      ...args,
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

  private async *streamMessageToGPT(
    message?: string,
    args: Partial<ResponseCreateParamsStreaming> = {}
  ): AsyncGenerator<string> {
    if (message) {
      this.history.push({ role: 'user', content: message })
    }

    const stream = await openai.responses.create({
      model: this.model,
      instructions: this.systemPrompt,
      input: this.history,
      stream: true,
      ...args
    })

    const toolCalls: OpenAI.Responses.ResponseFunctionToolCall[] = []

    let responseMessage = ''
    for await (const chunk of stream) {
      if (chunk.type === 'response.output_text.delta') {
        responseMessage += chunk.delta
        yield chunk.delta
      } else if (
        chunk.type === 'response.output_item.added' &&
        chunk.item.type === 'function_call'
      ) {
        toolCalls[chunk.output_index] =
          chunk.item as OpenAI.Responses.ResponseFunctionToolCall
      } else if (chunk.type === 'response.function_call_arguments.delta') {
        const index = chunk.output_index
        if (toolCalls[index] && Object.hasOwn(toolCalls[index], 'arguments')) {
          toolCalls[index].arguments += chunk.delta
        }
      }
    }

    if (toolCalls.length !== 0) {
      for (const tool of toolCalls) {
        const fnName = tool.name
        const fnArgs = JSON.parse(tool.arguments)

        const result = functions[fnName](fnArgs)
        this.history.push(tool)
        this.history.push({
          type: 'function_call_output',
          call_id: tool.call_id,
          output: result
        })
      }

      return yield* await this.streamMessageToGPT(undefined, args)
    }

    this.history.push({ role: 'assistant', content: responseMessage })
  }

  private isLlamaArgs(
    args: Record<string, unknown>
  ): args is Partial<Omit<ChatRequest, 'stream'>> {
    return true
  }

  private assertOpenAiArgs(
    args: Record<string, unknown>
  ): asserts args is Partial<ResponseCreateParamsStreaming> {
    if (!Object.hasOwn(args, 'model')) {
      // throw new Error('Found invalid args.')
    }
  }

  streamMessage(message: string, args: Record<string, unknown> = {}) {
    if (this.type === 'OLLAMA' && this.isLlamaArgs(args)) {
      return this.sendMessageToLlama(message, args)
    }

    this.assertOpenAiArgs(args)
    return this.streamMessageToGPT(message, args)
  }

  async talk(message: string) {
    const mp3 = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'alloy',
      input: message,
      instructions: `Voice: Deep and rugged, with a hearty, boisterous quality, like a seasoned sea captain who's seen many voyages.\n\nTone: Friendly and spirited, with a sense of adventure and enthusiasm, making every detail feel like part of a grand journey.\n\nDialect: Classic pirate speech with old-timey nautical phrases, dropped \"g\"s, and exaggerated \"Arrrs\" to stay in character.\n\nPronunciation: Rough and exaggerated, with drawn-out vowels, rolling \"r\"s, and a rhythm that mimics the rise and fall of ocean waves.\n\nFeatures: Uses playful pirate slang, adds dramatic pauses for effect, and blends hospitality with seafaring charm to keep the experience fun and immersive.`
    })

    const arrayBuffer = await mp3.arrayBuffer()
    const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' })
    const audioUrl = URL.createObjectURL(blob)

    const audio = new Audio(audioUrl)
    audio.play()
  }
}
