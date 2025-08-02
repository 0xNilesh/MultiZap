
"use client"

import { useState, useEffect } from "react"
import { useAccount, useDisconnect as useWagmiDisconnect } from "wagmi"
import { useConnectModal } from "@rainbow-me/rainbowkit"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowDown, Wallet, ChevronDown, CheckCircle, XCircle } from "lucide-react"
import { useAccount as useStarknetAccount, useConnect, useDisconnect } from "@starknet-react/core"
import { StarknetkitConnector, useStarknetkitConnectModal } from "starknetkit"
import { OrderService } from "@/services/orderService"
import { useEthereumApproveToken, useStarknetApproveToken } from "@/services"

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
  const [slippage, setSlippage] = useState(5) // Default 5% slippage
  
  // Order placement state
  const [isApproved, setIsApproved] = useState(false)
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)
  const [orderStatus, setOrderStatus] = useState<string>("")
  const [secret, setSecret] = useState("my-secret-key-123") // In production, this should be generated securely
  
  // Approval state
  const [approvalStatus, setApprovalStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle')
  const [approvalError, setApprovalError] = useState<string>("")
  
  // Order status polling
  const [orderId, setOrderId] = useState<string>("")
  const [pollingStatus, setPollingStatus] = useState<string>("")
  const [isPolling, setIsPolling] = useState(false)
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)

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

  // Approve token hooks
  const { approveUSDCToMax: approveEthereumUSDC, isPending: isEthereumApproving } = useEthereumApproveToken()
  const { approveUSDCToMax: approveStarknetUSDC, isPending: isStarknetApproving } = useStarknetApproveToken()

  useEffect(() => {
    
    disconnectEthereum()
    console.log("disconnected ethereum")
    disconnectStarknet()
    console.log("disconnected starknet")

  }, [])

  // Calculate destination amount based on slippage
  const calculateDestinationAmount = (sourceAmount: string, slippagePercent: number) => {
    if (!sourceAmount || parseFloat(sourceAmount) <= 0) return "0.0"
    const sourceValue = parseFloat(sourceAmount)
    const slippageMultiplier = (100 - slippagePercent) / 100
    return (sourceValue * slippageMultiplier).toFixed(2)
  }

  // Update destination amount when source amount or slippage changes
  useEffect(() => {
    const calculatedAmount = calculateDestinationAmount(sourceAmount, slippage)
    setDestinationAmount(calculatedAmount)
    
    // Reset approval status when amount or chain changes
    if (isApproved) {
      setIsApproved(false)
      setOrderStatus("")
      setApprovalStatus('idle')
      setApprovalError("")
    }
  }, [sourceAmount, slippage, sourceChain])

  // Poll order status
  const pollOrderStatus = async (orderId: string) => {
    try {
      const response = await fetch(`http://localhost:3001/orders/${orderId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch order status')
      }
      
      const data = await response.json()
      const order = data.order
      const assignment = data.assignment
      const events = data.events || []
      
      // Get latest event (events are sorted by timestamp desc, so first is latest)
      const latestEvent = events.length > 0 ? events[0] : null
      
      // Debug logging
      console.log('Order status:', order.status)
      console.log('Assignment status:', assignment?.status)
      console.log('Latest event:', latestEvent?.type)
      console.log('All events:', events.map((e: any) => ({ type: e.type, timestamp: e.timestamp })))
      
      // Check for specific events first
      if (latestEvent) {
        if (latestEvent.type === 'src_escrow_deployed') {
          setPollingStatus("Source escrow deployed, tokens withdrawn")
          return false
        } else if (latestEvent.type === 'dst_escrow_deployed') {
          setPollingStatus("Destination escrow deployed, funds deposited")
          // Stop polling and show claim button
          setIsPolling(false)
          if (pollingInterval) {
            clearInterval(pollingInterval)
            setPollingInterval(null)
          }
          return true // Ready to claim
        } else if (latestEvent.type === 'src_claimed') {
          setPollingStatus("Source claimed, secret revealed")
          return false
        }
      }
      
      // Check order status first
      if (order.status === 'pending_auction') {
        setPollingStatus("Order placed, auction started")
        return false
      } else if (order.status === 'assigned' && assignment) {
        setPollingStatus("Resolver assigned")
        return false
      }
      
      // Check assignment status for more detailed states
      if (assignment) {
        if (assignment.status === 'assigned') {
          setPollingStatus("Resolver assigned")
          return false
        } else if (assignment.status === 'src_deployed') {
          setPollingStatus("Source escrow deployed, tokens withdrawn")
          return false
        } else if (assignment.status === 'dst_deployed') {
          setPollingStatus("Destination escrow deployed, funds deposited")
          // Stop polling and show claim button
          setIsPolling(false)
          if (pollingInterval) {
            clearInterval(pollingInterval)
            setPollingInterval(null)
          }
          return true // Ready to claim
        } else if (assignment.status === 'claimed_src') {
          setPollingStatus("Source claimed, secret revealed")
          return false
        }
      }
      
      // If no assignment yet, check if order is still pending
      if (!assignment && order.status === 'pending_auction') {
        setPollingStatus("Order placed, waiting for resolver...")
        return false
      }
      
      return false
    } catch (error) {
      console.error('Error polling order status:', error)
      setPollingStatus("Error fetching order status")
      return false
    }
  }

  // Start polling when order is placed
  useEffect(() => {
    if (orderId && isPolling) {
      const interval = setInterval(async () => {
        const isReady = await pollOrderStatus(orderId)
        if (isReady) {
          setIsPolling(false)
        }
      }, 2000)
      
      setPollingInterval(interval)
      
      return () => {
        if (interval) {
          clearInterval(interval)
        }
      }
    }
  }, [orderId, isPolling])

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
    
      // Third: Check if approval is needed
  if (!isApproved && sourceAmount) {
    if (approvalStatus === 'pending') {
      return { text: "Approval pending, sign transaction", disabled: true, action: "approve" }
    }
    return { text: "Approve USDC", disabled: false, action: "approve" }
  }
    
      // Fourth: Check if polling or ready to claim
  if (isPolling) {
    return { text: "Processing...", disabled: true, action: "polling" }
  }
  
  // Fifth: Check if ready to claim
  if (orderId && !isPolling && (pollingStatus.includes("Destination escrow deployed") || pollingStatus.includes("Source claimed"))) {
    return { text: "Claim Funds", disabled: false, action: "claim" }
  }
  
  // Sixth: Both wallets connected and approved, show place order button
  return { text: "Place Order", disabled: !sourceAmount, action: "placeOrder" }
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
    } else if (buttonState.action === "approve") {
      try {
        setApprovalStatus('pending')
        setApprovalError("")
        
        if (sourceChain === "sepolia") {
          await approveEthereumUSDC()
          setApprovalStatus('success')
          setIsApproved(true)
          setOrderStatus("USDC approved for Ethereum")
          
          // Auto-clear approval message after 3 seconds
          setTimeout(() => {
            setOrderStatus("")
          }, 3000)
        } else if (sourceChain === "starknet") {
          await approveStarknetUSDC()
          setApprovalStatus('success')
          setIsApproved(true)
          setOrderStatus("USDC approved for Starknet")
          
          // Auto-clear approval message after 3 seconds
          setTimeout(() => {
            setOrderStatus("")
          }, 3000)
        }
      } catch (error) {
        console.error("Failed to approve USDC:", error)
        setApprovalStatus('error')
        setApprovalError(error instanceof Error ? error.message : "Failed to approve USDC")
        setOrderStatus("Failed to approve USDC")
        
        // Auto-clear error after 3 seconds
        setTimeout(() => {
          setApprovalStatus('idle')
          setApprovalError("")
          setOrderStatus("")
        }, 3000)
      }
    } else if (buttonState.action === "placeOrder") {
      try {
        setIsPlacingOrder(true)
        setOrderStatus("Preparing order...")
        
        // Get the appropriate addresses
        const sourceAddress = sourceChain === "sepolia" ? ethereumAddress : starknetAddress
        const destinationAddress = destinationChain === "sepolia" ? ethereumAddress : starknetAddress
        
        if (!sourceAddress || !destinationAddress) {
          throw new Error("Addresses not available")
        }
        
        // Prepare order data
        const orderData = OrderService.prepareOrder(
          sourceChain,
          destinationChain,
          sourceAddress,
          destinationAddress,
          sourceAmount,
          destinationAmount,
          secret
        )
        
        setOrderStatus("Submitting order to relayer...")
        
        // Submit order to relayer
        const result = await OrderService.submitOrder(orderData)
        
        setOrderStatus(`Order placed successfully! Order ID: ${result.orderId}`)
        setOrderId(result.orderId)
        setIsPolling(true)
        setPollingStatus("Order placed, auction started")
        
        // Auto-clear success message after 3 seconds
        setTimeout(() => {
          setOrderStatus("")
        }, 3000)
        
      } catch (error) {
        console.error("Failed to place order:", error)
        setOrderStatus(`Failed to place order: ${error instanceof Error ? error.message : 'Unknown error'}`)
      } finally {
        setIsPlacingOrder(false)
      }
    } else if (buttonState.action === "claim") {
      try {
        // Claim funds from destination escrow
        const destinationAddress = destinationChain === "sepolia" ? ethereumAddress : starknetAddress
        
        if (!destinationAddress) {
          throw new Error("Destination address not available")
        }
        
        setOrderStatus("Claiming funds from destination escrow...")
        
        // Call claim function based on destination chain
        if (destinationChain === "sepolia") {
          // Use Ethereum claim service
          // This would need to be implemented
          console.log("Claiming on Ethereum with secret:", secret)
        } else if (destinationChain === "starknet") {
          // Use Starknet claim service
          // This would need to be implemented
          console.log("Claiming on Starknet with secret:", secret)
        }
        
        // Upload secret to relayer
        const uploadResponse = await fetch(`http://localhost:3001/orders/${orderId}/upload-secret`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            secret: secret,
            claimTxHash: "0x..." // Would be actual tx hash
          }),
        })
        
        if (!uploadResponse.ok) {
          throw new Error('Failed to upload secret')
        }
        
        setOrderStatus("Transaction completed!")
        setPollingStatus("")
        setOrderId("")
        
        // Reset form after 3 seconds
        setTimeout(() => {
          setOrderStatus("")
          setSourceAmount("")
          setDestinationAmount("")
        }, 3000)
        
      } catch (error) {
        console.error("Failed to claim funds:", error)
        setOrderStatus(`Failed to claim funds: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
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
                <div className="text-xs text-gray-400 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-3 h-3" />
                    <span className="font-mono">
                      {sourceChain === "sepolia"
                        ? `${ethereumAddress?.slice(0, 6)}...${ethereumAddress?.slice(-4)}`
                        : `${starknetAddress?.slice(0, 6)}...${starknetAddress?.slice(-4)}`}
                    </span>
                  </div>
                  <button
                    onClick={() => sourceChain === "sepolia" ? disconnectEthereum() : disconnectStarknet()}
                    className="text-red-400 hover:text-red-300 text-xs"
                  >
                    Disconnect
                  </button>
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

              {/* Slippage Section */}
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Slippage</span>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={slippage}
                    onChange={(e) => setSlippage(parseFloat(e.target.value) || 0)}
                    className="w-16 h-8 text-sm bg-gray-700/50 border-gray-600 text-white text-center"
                    min="0"
                    max="100"
                  />
                  <span className="text-gray-400 text-sm">%</span>
                </div>
              </div>

              <Input
                type="number"
                placeholder="0.0"
                value={destinationAmount}
                readOnly
                className="text-2xl font-bold bg-gray-700/50 border-gray-600 text-white placeholder-gray-500 cursor-not-allowed"
              />

              {((destinationChain === "sepolia" && isEthereumConnected) ||
                (destinationChain === "starknet" && isStarknetConnected)) && (
                <div className="text-xs text-gray-400 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-3 h-3" />
                    <span className="font-mono">
                      {destinationChain === "sepolia"
                        ? `${ethereumAddress?.slice(0, 6)}...${ethereumAddress?.slice(-4)}`
                        : `${starknetAddress?.slice(0, 6)}...${starknetAddress?.slice(-4)}`}
                    </span>
                  </div>
                  <button
                    onClick={() => destinationChain === "sepolia" ? disconnectEthereum() : disconnectStarknet()}
                    className="text-red-400 hover:text-red-300 text-xs"
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="p-6 pt-4">
            <Button
    onClick={handleButtonClick}
    disabled={buttonState.disabled || isPlacingOrder || approvalStatus === 'pending' || isPolling}
    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 disabled:text-gray-400 text-white font-semibold py-4 text-lg rounded-2xl transition-all duration-200"
  >
    {isPlacingOrder ? "Placing Order..." : 
     approvalStatus === 'pending' ? "Sign Transaction..." : 
     isPolling ? "Processing..." : 
     buttonState.text}
  </Button>
        </div>

        {/* Approval Status */}
        {approvalStatus !== 'idle' && (
          <div className="px-6 pb-4">
            <div className={`rounded-lg p-3 border ${
              approvalStatus === 'success' 
                ? 'bg-green-900/50 border-green-700/50' 
                : approvalStatus === 'error'
                ? 'bg-red-900/50 border-red-700/50'
                : 'bg-blue-900/50 border-blue-700/50'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {approvalStatus === 'success' ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : approvalStatus === 'error' ? (
                    <XCircle className="w-4 h-4 text-red-500" />
                  ) : (
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  )}
                  <span className="text-sm text-gray-300">
                    {approvalStatus === 'pending' && "Token approval in process - Sign the transaction below"}
                    {approvalStatus === 'success' && "USDC approved successfully"}
                    {approvalStatus === 'error' && approvalError}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setApprovalStatus('idle')
                    setApprovalError("")
                  }}
                  className="text-gray-400 hover:text-gray-300 text-xs"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Order Status */}
        {orderStatus && (
          <div className="px-6 pb-4">
            <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {orderStatus.includes("successfully") ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : orderStatus.includes("Failed") ? (
                    <XCircle className="w-4 h-4 text-red-500" />
                  ) : (
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  )}
                  <span className="text-sm text-gray-300">{orderStatus}</span>
                </div>
                <button
                  onClick={() => setOrderStatus("")}
                  className="text-gray-400 hover:text-gray-300 text-xs"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Polling Status */}
        {pollingStatus && (
          <div className="px-6 pb-4">
            <div className="bg-blue-900/50 rounded-lg p-3 border border-blue-700/50">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm text-gray-300">{pollingStatus}</span>
              </div>
            </div>
          </div>
        )}

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
