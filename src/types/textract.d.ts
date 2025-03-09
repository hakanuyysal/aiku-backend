declare module 'textract' {
  type TextractCallback = (error: Error | null, text: string) => void;

  interface TextractConfig {
    preserveLineBreaks?: boolean;
    preserveOnlyMultipleLineBreaks?: boolean;
    includeAltText?: boolean;
  }

  function fromFileWithPath(filePath: string, callback: TextractCallback): void;
  function fromFileWithPath(filePath: string, config: TextractConfig, callback: TextractCallback): void;

  export = {
    fromFileWithPath
  };
} 