Currently Implemented Context Engine Features

1. Use Unstructured to extract text from pdf files
- limitations: 
- 1. does not support complex formulae.
- 2. the read can be inaccurate sometime.

2. Then Chonkie is used to chunk the data into desired size, hopefully.
- limitations:
1. the chuck might not always have semantic meaning and chucked correctly
2. currently, we are using chookie neural chunker as a temporal solution.
3. this is the perfect solution and should be replaced in the futher, however, it should be able to achieve the level of accuracy for the sake of MVP

3. As of Fri 16 Jan
   4. first goal -> to figure out where vector database or rag is used in the AI conversation
   5. Incorporate the AI conversation to test the rag system, to make sure it is in place
   6. Then Enable 