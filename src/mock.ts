export const data = {
  chain: {
    id: '5',
    name: 'goerli',
  },
  vault: '0x7c5dB9172038F6748FDCac2528b07c9F98Dd8aa4',
  wallet: '0x683C0803F89308c4e05e14Dcfc51eCEBF7889f6c',
  blocks: [
    {
      nodeId: 'f70d02d6-b486-4cf2-ae3a-9864899bec7e',
      method: 'balanceOf',
      methodType: 'getters',
      protocol: 'ERC20',
      params: [
        {
          key: 'to',
          value: '0xba232b47a7ddfccc221916cf08da03a4973d3a1d',
        },
        {
          key: 'methodParams.owner',
          value: '0x7c5dB9172038F6748FDCac2528b07c9F98Dd8aa4',
        },
      ],
      outputs: [
        {
          key: 'balance',
        },
      ],
      options: {
        flow: 'OK_CONT_FAIL_REVERT',
        jumpOnSuccess: '2726a55c-2fd9-4c2e-a396-7386800afad8',
        jumpOnFail: '',
      },
    },
    {
      nodeId: '2726a55c-2fd9-4c2e-a396-7386800afad8',
      method: 'between',
      methodType: 'getters',
      protocol: 'TOKEN_VALIDATOR',
      params: [
        {
          key: 'to',
          value: '0x93a9E720C3B161F70e60A7bd844F8ee6b19f07DE',
        },
        {
          key: 'methodParams.minAmount',
          value: '1000000000000000000',
        },
        {
          key: 'methodParams.minDecimals',
          value: 18,
        },
        {
          key: 'methodParams.maxAmount',
          value: '100000000000000000000',
        },
        {
          key: 'methodParams.maxDecimals',
          value: 18,
        },
        {
          key: 'methodParams.amountIn',
          value: {
            type: 'output',
            id: {
              innerIndex: 0,
              nodeId: 'f70d02d6-b486-4cf2-ae3a-9864899bec7e',
            },
          },
        },
        {
          key: 'methodParams.decimalsIn',
          value: 18,
        },
        {
          key: 'methodParams.decimalsOut',
          value: 18,
        },
      ],
      outputs: [
        {
          key: 'result',
        },
        {
          key: 'decimalsIn',
        },
        {
          key: 'decimalsOut',
        },
      ],
      options: {
        flow: 'OK_CONT_FAIL_REVERT',
        jumpOnSuccess: 'd6077464-2afb-4450-a68e-0d91de4b6d1a',
        jumpOnFail: '',
      },
    },
    {
      nodeId: 'd6077464-2afb-4450-a68e-0d91de4b6d1a',
      method: 'simpleTransfer',
      methodType: 'actions',
      protocol: 'ERC20',
      params: [
        {
          key: 'to',
          value: '0xba232b47a7ddfccc221916cf08da03a4973d3a1d',
        },
        {
          key: 'isVault',
          value: true,
        },
        {
          key: 'methodParams.from',
          value: '0x7c5dB9172038F6748FDCac2528b07c9F98Dd8aa4',
        },
        {
          key: 'methodParams.to',
          value: '0x683C0803F89308c4e05e14Dcfc51eCEBF7889f6c',
        },
        {
          key: 'methodParams.amount',
          value: {
            type: 'output',
            id: {
              innerIndex: 0,
              nodeId: 'f70d02d6-b486-4cf2-ae3a-9864899bec7e',
            },
          },
        },
      ],
      outputs: [
        {
          key: 'success',
        },
      ],
      options: {
        flow: 'OK_STOP_FAIL_REVERT',
        jumpOnSuccess: '',
        jumpOnFail: '',
      },
    },
  ],
};
