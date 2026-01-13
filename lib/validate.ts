import * as z from "zod";


export const validateSchema =<T>(schema:z.ZodType<T>) => (data:unknown): T => {
   const result = schema.safeParse(data);
   
   if (!result.success){
    throw result.error
   }
   return result.data;
}