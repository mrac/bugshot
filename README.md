# bugshot

Bugshot is a testing tool for React/TypeScript/Jest applications that finds issues in unit-tests. It's a second layer for unit-testing: uses **fault-injection** techique, monitors for false-negatives and alarm you when your unit-test doesn't test good enough.

### To install

```
npm install --save-dev git+https://github.com/mrac/bugshot.git
```

### To run

```
./bin/bugshot.js --config=./path/to/my/bugshot.config.json
```

### Parameters

#### t

A single component file.

```
./bin/bugshot.js --config=./path/to/my/bugshot.config.json --t=my-text-area
```

#### p

A single component parameter.

```
./bin/bugshot.js --config=./path/to/my/bugshot.config.json --t=my-text-area --p=children
```

### Config example

```
{
  "baseDir": "../..",
  "jestConfig: "./path/to/my/jest.config.js",
  "sourceFiles: "./src/client/components/common/**/*.tsx",
  "ignore": [
    "./src/client/components/common/**/*.bugshot-fault.tsx",
    "./src/client/components/common/**/*.bugshot-fault.test.tsx",
    "./src/client/components/common/**/*.story.tsx",
    "./src/client/components/common/**/*.test.tsx",
    "./src/client/components/common/**/*-styles.ts",
    "./src/client/components/common/**/*-styles.tsx"
  ]
}
```
