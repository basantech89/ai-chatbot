import NxWelcome from './nx-welcome'

import { Route, Routes } from 'react-router-dom'

export function App() {
  return (
    <div>
      <Routes>
        <Route
          path="/"
          element={<NxWelcome title="ai-chatbot" />}
        />
        {/* <Route
          path="/page-2"
          element={<AirlineChatbotWithoutStreaming />}
        /> */}
      </Routes>
      {/* END: routes */}
    </div>
  )
}

export default App
