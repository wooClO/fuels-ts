import { BigNumber } from '@ethersproject/bignumber';

import FunctionFragment from './fragments/function-fragment';
import Interface from './interface';

describe('Interface', () => {
  const jsonFragment = {
    type: 'function',
    inputs: [{ name: 'arg', type: 'u64' }],
    name: 'entry_one',
    outputs: [],
  };
  const fragment = FunctionFragment.fromObject(jsonFragment);
  let functionInterface: Interface;

  it('encodes the function name', () => {
    let encoded = Interface.getSighash('entry_one(u64)');
    expect(encoded).toEqual('0x000000000c36cb9c');
    encoded = Interface.getSighash(fragment);
    expect(encoded).toEqual('0x0000000044aa0fa9');
  });

  it('removes duplicates if function signatures are repeated', () => {
    functionInterface = new Interface([jsonFragment, jsonFragment]);
    expect(Object.values(functionInterface.functions)).toHaveLength(1);
  });

  it('can retreive a fragment', () => {
    functionInterface = new Interface([jsonFragment]);

    expect(Object.values(functionInterface.functions)).toHaveLength(1);

    expect(functionInterface.getFunction('entry_one(u64,u64,b256,u64)')).toEqual(fragment);
    expect(functionInterface.getFunction('entry_one')).toEqual(fragment);
    expect(functionInterface.getFunction('0x0000000044aa0fa9')).toEqual(fragment);
  });

  it('can encode and decodes function data with simple values', () => {
    functionInterface = new Interface([jsonFragment]);
    expect(functionInterface.encodeFunctionData('entry_one', [42])).toEqual(
      '0x0000000044aa0fa9000000000000002a'
    );
    const decoded = functionInterface.decodeFunctionData(
      'entry_one',
      '0x0000000044aa0fa9000000000000002a'
    );
    // toEqual can't handle BigNumbers so JSON.stringify is used
    expect(JSON.stringify(decoded)).toEqual(JSON.stringify([BigNumber.from(42)]));
  });

  it('can encode and decodes function data with array values', () => {
    functionInterface = new Interface([
      {
        type: 'function',
        inputs: [
          {
            name: 'arg',
            type: 'u16[3]',
          },
        ],
        name: 'takes_array',
        outputs: [
          {
            name: '',
            type: 'u16[2]',
          },
        ],
      },
    ]);
    expect(functionInterface.encodeFunctionData('takes_array', [[1, 2, 3]])).toEqual(
      '0x0000000053030075000000000000000100000000000000020000000000000003'
    );
  });

  it('can encode and decodes function data with tuple values', () => {
    functionInterface = new Interface([
      {
        inputs: [
          {
            name: 'person',
            type: 'tuple',
            components: [
              {
                name: 'name',
                type: 'str[20]',
              },
              {
                name: 'address',
                type: 'address',
              },
            ],
          },
        ],
        name: 'tuple_function',
        outputs: [],
        type: 'function',
      },
    ]);
    type PersonStruct = { address: string; name: string };
    expect(
      functionInterface.encodeFunctionData('tuple_function', [
        {
          address: '0xd5579c46dfcc7f18207013e65b44e4cb4e2c2298f4ac457ba8f82743f31e930b',
          name: 'foo',
        } as PersonStruct,
      ])
    ).toEqual(
      '0x00000000ba463b0d666f6f00000000d5579c46dfcc7f18207013e65b44e4cb4e2c2298f4ac457ba8f82743f31e930b'
    );
    expect(
      functionInterface.encodeFunctionData('tuple_function', [
        ['foo', '0xd5579c46dfcc7f18207013e65b44e4cb4e2c2298f4ac457ba8f82743f31e930b'],
      ])
    ).toEqual(
      '0x00000000ba463b0d666f6f00000000d5579c46dfcc7f18207013e65b44e4cb4e2c2298f4ac457ba8f82743f31e930b'
    );
  });

  it('can encode and decodes function data with empty values', () => {
    functionInterface = new Interface([
      { type: 'function', inputs: [], name: 'entry_one', outputs: [] },
    ]);
    expect(functionInterface.encodeFunctionData('entry_one', [])).toEqual('0x000000007e648301');
    expect(functionInterface.decodeFunctionData('entry_one', '0x000000007e648301')).toEqual([]);
  });

  it('raises an error if the function is not found', () => {
    functionInterface = new Interface([jsonFragment]);
    expect(() => functionInterface.encodeFunctionData('entry_two', [42])).toThrow(
      'function entry_two not found'
    );
    expect(() =>
      functionInterface.decodeFunctionData('entry_two', '0x00000000000000000000000000000000')
    ).toThrow('function entry_two not found');
  });

  it('raises an error if the arguments do not match the function input types', () => {
    expect(() => functionInterface.encodeFunctionData('entry_one', [true])).toThrow('Invalid u64');
    expect(() => functionInterface.encodeFunctionData('entry_one', [11, 11])).toThrow(
      'Types/values length mismatch'
    );
    expect(() =>
      functionInterface.decodeFunctionData('entry_one', '0x1111111111111111000000000000002a')
    ).toThrow('data signature does not match function entry_one');
  });
});