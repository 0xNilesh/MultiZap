
"use client"

import { useState, useEffect } from "react"
import { useAccount, useDisconnect as useWagmiDisconnect } from "wagmi"
import { useConnectModal } from "@rainbow-me/rainbowkit"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowDown, Wallet, ChevronDown } from "lucide-react"
import { useAccount as useStarknetAccount, useConnect, useDisconnect } from "@starknet-react/core"
import { StarknetkitConnector, useStarknetkitConnectModal } from "starknetkit"

interface Chain {
  id: string
  name: string
  color: string
}

const chains: Chain[] = [
  { id: "sepolia", name: "Ethereum Sepolia", color: "bg-blue-500" },
  { id: "starknet", name: "Starknet", color: "bg-purple-500" },
]

export function SwapInterface() {
  const [sourceAmount, setSourceAmount] = useState("")
  const [destinationAmount, setDestinationAmount] = useState("")
  const [sourceChain, setSourceChain] = useState("sepolia")
  const [destinationChain, setDestinationChain] = useState("starknet")

  

  // Ethereum connection
  const { address: ethereumAddress, isConnected: isEthereumConnected } = useAccount()
  const { disconnect: disconnectEthereum } = useWagmiDisconnect()
  const { openConnectModal } = useConnectModal()

  // Starknet connection
  const { address: starknetAddress, isConnected: isStarknetConnected } = useStarknetAccount()
  const { disconnect: disconnectStarknet } = useDisconnect()
  const { connectAsync, connectors } = useConnect()
  const { starknetkitConnectModal } = useStarknetkitConnectModal({
    connectors: connectors as StarknetkitConnector[],
    modalTheme: "dark",
  })

  useEffect(() => {
    
    disconnectEthereum()
    console.log("disconnected ethereum")
    disconnectStarknet()
    console.log("disconnected starknet")

  }, [])

  const getSelectedChain = (chainId: string) => chains.find((c) => c.id === chainId)

  const getButtonState = () => {
    // First: Check if source wallet needs connection
    if (sourceChain === "sepolia" && !isEthereumConnected) {
      return { text: "Connect Source Wallet", disabled: false, action: "ethereum" }
    }
    if (sourceChain === "starknet" && !isStarknetConnected) {
      return { text: "Connect Source Wallet", disabled: false, action: "starknet" }
    }
    
    // Second: Check if destination wallet needs connection
    if (destinationChain === "sepolia" && !isEthereumConnected) {
      return { text: "Connect Destination Wallet", disabled: false, action: "ethereum" }
    }
    if (destinationChain === "starknet" && !isStarknetConnected) {
      return { text: "Connect Destination Wallet", disabled: false, action: "starknet" }
    }
    
    // Third: Both wallets connected, show transaction button
    return { text: "Initiate Transaction", disabled: !sourceAmount, action: "transaction" }
  }

  const handleButtonClick = async () => {
    const buttonState = getButtonState()
  

    if (buttonState.action === "ethereum") {
      // Force disconnect Ethereum first, then connect
      try {
       
        // Open RainbowKit connect modal
        openConnectModal?.()
      } catch (error) {
        console.error("Failed to handle Ethereum connection:", error)
      }
    } else if (buttonState.action === "starknet") {
      // Force disconnect Starknet first, then connect
      try {
       
        const { connector } = await starknetkitConnectModal()
          if (!connector) {
            // or throw error
            return
          }
          await connectAsync({ connector })
          console.log("connected starknet", starknetAddress)
      } catch (error) {
        console.error("Failed to connect Starknet wallet:", error)
      }
    } else if (buttonState.action === "transaction") {
      console.log("Initiating cross-chain swap...")
    }
  }

  const swapChains = () => {
    const tempChain = sourceChain
    const tempAmount = sourceAmount

    setSourceChain(destinationChain)
    setDestinationChain(tempChain)
    setSourceAmount(destinationAmount)
    setDestinationAmount(tempAmount)
  }

  const buttonState = getButtonState()
  const sourceChainData = getSelectedChain(sourceChain)
  const destChainData = getSelectedChain(destinationChain)

  return (
    <Card className="w-full max-w-lg bg-gray-900/95 border-gray-800 backdrop-blur-sm">
      <CardContent className="p-0">
        {/* Header */}
        <div className="p-6 pb-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">Swap</h1>
          </div>
        </div>

        <div className="px-6 space-y-1">
          {/* Source Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm font-medium">You pay</span>
            </div>

            <div className="bg-gray-800/50 rounded-2xl p-4 space-y-4 border border-gray-700/50">
              <div className="flex items-center gap-3">
                <Select value={sourceChain} onValueChange={setSourceChain}>
                  <SelectTrigger className="flex-1 bg-gray-700/50 border-gray-600 text-white hover:bg-gray-700">
                    <SelectValue>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${sourceChainData?.color}`}></div>
                        <span className="text-sm">{sourceChainData?.name}</span>
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {chains.map((chain) => (
                      <SelectItem key={chain.id} value={chain.id} className="text-white hover:bg-gray-700">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${chain.color}`}></div>
                          <span>{chain.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select defaultValue="usdc">
                  <SelectTrigger className="w-24 bg-gray-700/50 border-gray-600 text-white hover:bg-gray-700">
                    <SelectValue>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">USDC</span>
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="usdc" className="text-white hover:bg-gray-700">
                      USDC
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Input
                type="number"
                placeholder="0.0"
                value={sourceAmount}
                onChange={(e) => setSourceAmount(e.target.value)}
                className="text-2xl font-bold bg-transparent border-gray-600 text-white placeholder-gray-500 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />

              {((sourceChain === "sepolia" && isEthereumConnected) ||
                (sourceChain === "starknet" && isStarknetConnected)) && (
                <div className="text-xs text-gray-400 flex items-center gap-2">
                  <Wallet className="w-3 h-3" />
                  <span className="font-mono">
                    {sourceChain === "sepolia"
                      ? `${ethereumAddress?.slice(0, 6)}...${ethereumAddress?.slice(-4)}`
                      : `${starknetAddress?.slice(0, 6)}...${starknetAddress?.slice(-4)}`}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center py-2">
            <button
              onClick={swapChains}
              className="bg-gray-800 hover:bg-gray-700 rounded-full p-2 border border-gray-700 transition-colors"
            >
              <ArrowDown className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* Destination Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm font-medium">You receive</span>
            </div>

            <div className="bg-gray-800/50 rounded-2xl p-4 space-y-4 border border-gray-700/50">
              <div className="flex items-center gap-3">
                <Select value={destinationChain} onValueChange={setDestinationChain}>
                  <SelectTrigger className="flex-1 bg-gray-700/50 border-gray-600 text-white hover:bg-gray-700">
                    <SelectValue>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${destChainData?.color}`}></div>
                        <span className="text-sm">{destChainData?.name}</span>
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {chains.map((chain) => (
                      <SelectItem key={chain.id} value={chain.id} className="text-white hover:bg-gray-700">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${chain.color}`}></div>
                          <span>{chain.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select defaultValue="usdc">
                  <SelectTrigger className="w-24 bg-gray-700/50 border-gray-600 text-white hover:bg-gray-700">
                    <SelectValue>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">USDC</span>
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="usdc" className="text-white hover:bg-gray-700">
                      USDC
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Input
                type="number"
                placeholder="0.0"
                value={destinationAmount}
                onChange={(e) => setDestinationAmount(e.target.value)}
                className="text-2xl font-bold bg-transparent border-gray-600 text-white placeholder-gray-500 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />

              {((destinationChain === "sepolia" && isEthereumConnected) ||
                (destinationChain === "starknet" && isStarknetConnected)) && (
                <div className="text-xs text-gray-400 flex items-center gap-2">
                  <Wallet className="w-3 h-3" />
                  <span className="font-mono">
                    {destinationChain === "sepolia"
                      ? `${ethereumAddress?.slice(0, 6)}...${ethereumAddress?.slice(-4)}`
                      : `${starknetAddress?.slice(0, 6)}...${starknetAddress?.slice(-4)}`}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="p-6 pt-4">
          <Button
            onClick={handleButtonClick}
            disabled={buttonState.disabled}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 disabled:text-gray-400 text-white font-semibold py-4 text-lg rounded-2xl transition-all duration-200"
          >
            {buttonState.text}
          </Button>
        </div>

        {/* Connection Status */}
        <div className="px-6 pb-6">
          <div className="flex justify-between text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isEthereumConnected ? "bg-green-500" : "bg-gray-600"}`}></div>
              Ethereum {isEthereumConnected ? "Connected" : "Disconnected"}
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isStarknetConnected ? "bg-green-500" : "bg-gray-600"}`}></div>
              Starknet {isStarknetConnected ? "Connected" : "Disconnected"}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
