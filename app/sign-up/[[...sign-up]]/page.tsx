import { SignUp } from '@clerk/nextjs'

export default function Page() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-8">
      <div className="w-full max-w-md mx-auto flex flex-col items-center">
        <h1 className="text-3xl text-center mb-6 text-gray-900 w-full">
          <span style={{ fontFamily: 'var(--font-source-code-pro), monospace' }}>Welcome to </span>
          <span className="font-normal" style={{ color: '#B1521C', fontFamily: 'var(--font-shadows-into-light), cursive' }}>Developer Docs</span>
        </h1>
        <div className="w-full flex justify-center">
          <SignUp 
            appearance={{
              elements: {
                rootBox: "w-full flex justify-center",
                card: "w-full mx-auto",
              },
            }}
          />
        </div>
      </div>
    </div>
  )
}