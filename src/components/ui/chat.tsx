'use client'

import * as React from 'react'
import {
  ArrowUpIcon,
  CheckIcon,
  Command,
  PlusIcon,
  BotMessageSquare,
  Bot
} from 'lucide-react'

import { cn } from '@/lib/utils'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui'
import { LLM } from '@/lib/llm'
import ReactMarkdown from 'react-markdown'

const llm = new LLM()

const users = [
  {
    name: 'Olivia Martin',
    email: 'm@example.com',
    avatar: '/avatars/01.png'
  },
  {
    name: 'Isabella Nguyen',
    email: 'isabella.nguyen@email.com',
    avatar: '/avatars/03.png'
  },
  {
    name: 'Emma Wilson',
    email: 'emma@example.com',
    avatar: '/avatars/05.png'
  },
  {
    name: 'Jackson Lee',
    email: 'lee@example.com',
    avatar: '/avatars/02.png'
  },
  {
    name: 'William Kim',
    email: 'will@email.com',
    avatar: '/avatars/04.png'
  }
] as const

type User = (typeof users)[number]

export function Chatbot() {
  const [open, setOpen] = React.useState(false)
  const [sendingMessage, setSendingMessage] = React.useState(false)
  const [assistantSending, setAssistantSending] = React.useState(false)
  const [selectedUsers, setSelectedUsers] = React.useState<User[]>([])
  const [assistantMessage, setAssistantMessage] = React.useState('')

  const messages = React.useSyncExternalStore(
    llm.subscribe.bind(llm),
    llm.getSnapshot.bind(llm)
  )

  const devRef = React.useRef<HTMLDivElement>(null)

  const [chatbotOpen, setChatbotOpen] = React.useState(false)
  const toggleChatbot = () => setChatbotOpen(!chatbotOpen)

  const [input, setInput] = React.useState('')
  const inputLength = input.trim().length

  const sendMessage = async () => {
    const isSending = true
    setSendingMessage(isSending)
    setAssistantSending(true)

    const stream = await llm.sendMessage(input)
    setInput('')

    for await (const chunk of stream) {
      setAssistantMessage(prev => prev + chunk)

      if (devRef.current) {
        devRef.current.scrollIntoView({
          behavior: 'smooth',
          inline: 'end',
          block: 'end'
        })
      }

      if (isSending) {
        setSendingMessage(false)
      }
    }

    setAssistantMessage('')
    setAssistantSending(false)
  }

  const triggerMessage = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (inputLength === 0) {
      return
    }

    setAssistantMessage('')
    sendMessage()
  }

  if (!chatbotOpen) {
    return (
      <Button
        size="icon"
        id="chatbot-btn"
        className="fixed bottom-10 right-10 size-12"
        onClick={toggleChatbot}
      >
        <BotMessageSquare />
      </Button>
    )
  }

  return (
    <>
      <Card className="flex flex-col w-96 h-2/5 fixed bottom-10 right-10">
        <Button
          size="icon"
          variant="outline"
          className="fixed right-12 rounded -translate-y-4 border-current"
          id="chatbot-close-btn"
          onClick={toggleChatbot}
        >
          <Bot />
        </Button>
        <CardHeader className="flex flex-row items-center">
          <div className="flex items-center gap-4">
            <Avatar className="border">
              <AvatarImage
                src="/avatars/01.png"
                alt="Image"
              />
              <AvatarFallback>S</AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-0.5">
              <p className="text-sm leading-none font-medium">Sofia Davis</p>
              <p className="text-muted-foreground text-xs">m@example.com</p>
            </div>
          </div>
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="secondary"
                  className="ml-auto size-8 rounded-full"
                  onClick={() => setOpen(true)}
                >
                  <PlusIcon />
                  <span className="sr-only">New message</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent sideOffset={10}>New message</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto">
          <div className="flex flex-col gap-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  'flex w-max max-w-[75%] flex-col gap-2 rounded-lg px-3 py-2 text-sm',
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground ml-auto'
                    : 'bg-muted'
                )}
              >
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
            ))}

            {assistantMessage && (
              <div
                ref={el => {
                  devRef.current = el
                }}
                className="flex w-max max-w-[75%] flex-col gap-2 rounded-lg px-3 py-2 text-sm bg-muted"
              >
                <ReactMarkdown>{assistantMessage}</ReactMarkdown>
              </div>
            )}

            {sendingMessage && (
              <div className="flex w-min px-4 pt-3 pb-2 rounded space-x-2 justify-center items-center bg-muted dark:invert">
                <div className="h-2 w-2 bg-black pt-2 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="h-2 w-2 bg-black pt-2 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="h-2 w-2 bg-black pt-2 rounded-full animate-bounce"></div>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <form
            onSubmit={triggerMessage}
            className="relative w-full"
          >
            <Input
              id="message"
              placeholder="Type your message..."
              className="flex-1 pr-10"
              autoComplete="off"
              value={input}
              onChange={event => setInput(event.target.value)}
            />
            <Button
              type="submit"
              size="icon"
              className="absolute top-1/2 right-2 size-6 -translate-y-1/2 rounded-full"
              disabled={inputLength === 0 || assistantSending}
            >
              <ArrowUpIcon className="size-3.5" />
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </CardFooter>
      </Card>
      <Dialog
        open={open}
        onOpenChange={setOpen}
      >
        <DialogContent className="gap-0 p-0 outline-none">
          <DialogHeader className="px-4 pt-5 pb-4">
            <DialogTitle>New message</DialogTitle>
            <DialogDescription>
              Invite a user to this thread. This will create a new group
              message.
            </DialogDescription>
          </DialogHeader>
          <Command className="overflow-hidden rounded-t-none border-t bg-transparent">
            <CommandInput placeholder="Search user..." />
            <CommandList>
              <CommandEmpty>No users found.</CommandEmpty>
              <CommandGroup>
                {users.map(user => (
                  <CommandItem
                    key={user.email}
                    data-active={selectedUsers.includes(user)}
                    className="data-[active=true]:opacity-50"
                    onSelect={() => {
                      if (selectedUsers.includes(user)) {
                        return setSelectedUsers(
                          selectedUsers.filter(
                            selectedUser => selectedUser !== user
                          )
                        )
                      }

                      return setSelectedUsers(
                        [...users].filter(u =>
                          [...selectedUsers, user].includes(u)
                        )
                      )
                    }}
                  >
                    <Avatar className="border">
                      <AvatarImage
                        src={user.avatar}
                        alt="Image"
                      />
                      <AvatarFallback>{user.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="ml-2">
                      <p className="text-sm leading-none font-medium">
                        {user.name}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        {user.email}
                      </p>
                    </div>
                    {selectedUsers.includes(user) ? (
                      <CheckIcon className="text-primary ml-auto flex size-4" />
                    ) : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
          <DialogFooter className="flex items-center border-t p-4 sm:justify-between">
            {selectedUsers.length > 0 ? (
              <div className="flex -space-x-2 overflow-hidden">
                {selectedUsers.map(user => (
                  <Avatar
                    key={user.email}
                    className="inline-block border"
                  >
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback>{user.name[0]}</AvatarFallback>
                  </Avatar>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                Select users to add to this thread.
              </p>
            )}
            <Button
              disabled={selectedUsers.length < 2}
              size="sm"
              onClick={() => {
                setOpen(false)
              }}
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
