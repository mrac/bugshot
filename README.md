# fault-injection

### To install

```
npm install --save git+https://github.com/mrac/fault-injection.git
```

### To run

```
./bin/fault-injection.js --config=my-fault-injection.config.js
```

### Config example

```
module.exports = {
  jestConfig: './config/jest/jest.config.js',
  sourceFiles: './src/client/components/common/**/*.tsx',
  ignore: [
    './src/client/components/common/**/*.fault.tsx',
    './src/client/components/common/**/*.fault.test.tsx',
    './src/client/components/common/**/*.story.tsx',
    './src/client/components/common/**/*.test.tsx',
    './src/client/components/common/**/*-styles.ts',
    './src/client/components/common/**/*-styles.tsx'
  ]
};
```

