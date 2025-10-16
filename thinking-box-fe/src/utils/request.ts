import axios,{AxiosRequestConfig,AxiosResponse} from "axios";


interface RequestOption {
    headers?:Record<string,string>;
    body?:any

}
type Method = "GET" | "POST";

const handleRequest = async (method:Method,url:string,options:RequestOption) =>{

 try {
  console.log("url here",url)
    const config: AxiosRequestConfig = {
      method,
      url:url,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      ...(method === "POST" && { data: options.body }),
    };
    console.log("config",config)
    const response: AxiosResponse = await axios(config);
    return response.data;
  } catch (error:any) {
    console.error(" handleRequest error:", error?.response || error);
    throw new Error(
      error?.response?.data?.message ||
        error.message ||
        "An error occurred while making the request"
    );
  }
}
export default handleRequest;