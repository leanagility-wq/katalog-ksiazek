declare module "@react-native-ml-kit/text-recognition" {
  export interface TextRecognitionFrame {
    left: number;
    top: number;
    width: number;
    height: number;
  }

  export interface TextRecognitionLine {
    text: string;
    frame: TextRecognitionFrame;
  }

  export interface TextRecognitionBlock {
    text: string;
    frame: TextRecognitionFrame;
    lines: TextRecognitionLine[];
  }

  export interface TextRecognitionResult {
    text: string;
    blocks: TextRecognitionBlock[];
  }

  const TextRecognition: {
    recognize: (imageUri: string) => Promise<TextRecognitionResult>;
  };

  export default TextRecognition;
}
