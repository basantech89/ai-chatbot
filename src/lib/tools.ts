const getTicketPrice = ({ destinationCity }: { destinationCity: string }) => {
  const ticketPrices: Record<string, string> = {
    london: '$799',
    paris: '$899',
    tokyo: '$1400'
  }

  return ticketPrices[destinationCity.toLowerCase()] || 'unknown'
}

export const functions: Record<string, (...args: any[]) => string> = {
  getTicketPrice
}
