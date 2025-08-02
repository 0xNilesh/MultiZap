import { Abi } from 'starknet';

interface StarknetAbiJson {
  functions: {
    name: string;
    type: string;
    inputs: { name: string; type: string; }[];
    outputs?: { name: string; type: string; }[];
  }[];
  events?: {
    name: string;
    type: string;
    inputs: { name: string; type: string; }[];
  }[];
}

export function convertStarknetAbi(abiJson: StarknetAbiJson): Abi {
  // Convert functions to array format
  const functions = Object.values(abiJson.functions).map(fn => ({
    ...fn,
    inputs: fn.inputs,
    outputs: fn.outputs || []
  }));

  // Convert events if they exist
  const events = abiJson.events 
    ? Object.values(abiJson.events).map(event => ({
        ...event,
        inputs: event.inputs
      }))
    : [];

  // Return combined ABI array
  return [...functions, ...events];
}
