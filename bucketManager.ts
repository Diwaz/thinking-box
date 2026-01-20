import oci from "oci-sdk";

const provider = new oci.common.ConfigFileAuthenticationDetailsProvider();
const client = new oci.objectstorage.ObjectStorageClient({authenticationDetailsProvider:provider});

const namespace = process.env.BUCKET_NAMESPACE!;
const bucketName = process.env.BUCKET_NAME!;
const localDir = process.env.BUCKET_LOCAL_DIR!;
// const prefix = process.env.BUCKET_PREFIX!;
import fs from "fs";
import path from "path";
import Sandbox from "e2b";
import type { Readable } from "stream";

// export const makePrefix = (projectId:string)=>{
//     return `projects/${projectId}/TB/`
// }


export const backupDataToBucket= async (sandbox:Sandbox,userId:string,projectId:string): Promise<boolean> =>{
    
    try {

        const projectFiles = await sandbox.files.list('/home/user');
        if (!projectFiles || projectFiles.length === 0){
            console.log("No files yet");
            return false;
        }

        const tempDir = `/tmp/archive_${projectId}`;
        const tarPath = `${tempDir}/project.tar.gz`;

        await sandbox.commands.run(`mkdir -p ${tempDir}`);

        const tarResult = await sandbox.commands.run(
              `cd /home/user && tar -czf ${tarPath} \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='dist' \
    --exclude='.next' \
    --exclude='build' \
    --exclude='.npm' \
    --exclude='.cache' \
    --exclude='.bash_logout' \
    --exclude='.bashrc' \
    --exclude='.profile' \
    . 2>&1 || echo "TAR_FAILED"`,
    {
    onStdout: (data) => console.log("TAR:", data),
    onStderr: (data) => console.error("TAR stderr:", data)
    }
        )
    if (tarResult.stdout.includes("TAR_FAILED")) {
      console.log(`TAR failed for ${projectId}`);
      await sandbox.commands.run(`rm -rf ${tempDir}`);
    //   if (retries < 3) {
    //       retries = retries +1;
    //       backupDataToBucket(sandbox,userId,projectId,retries)
    //   }
      return false;
    }
 try {
        const tarContent = await sandbox.files.read(tarPath,{format:"bytes"});
        if (!tarContent || tarContent.length === 0){
            console.log(" TAR file is empty ");
            await sandbox.commands.run(`rm -rf ${tempDir}`);
            return false;
        }
        console.log(`TAR file size: ${tarContent.length} bytes`);

        const buffer = Buffer.from(tarContent);
        
        await client.putObject({
            namespaceName:namespace,
            bucketName,
            objectName: `thinking-box/projects/${projectId}.tar.gz`,
            putObjectBody: buffer,
            contentType: 'application/gzip' 
        })
         console.log(`Saved to oci-bucket://${bucketName}/${projectId}`);
      await sandbox.commands.run(`rm -rf ${tempDir}`);

      return true;
    }catch(err){
          console.error(`Failed to read TAR file:`, err);
      return false;
    }
    }catch(err){
        console.log("error:",err)
        return false ;
    }

   
}
export const isObjectExist = async (projectId:string):Promise<boolean> => {

    const objectName = `thinking-box/projects/${projectId}.tar.gz`;
try {
      await client.headObject({
                 namespaceName: namespace,
                 bucketName,
                 objectName,
            })
    return true; 
}catch(err){

    console.log(`No saved project found`);
    return false;
}
} 

export const loadProjectFromBucket= async(
  sandbox: Sandbox,
  projectId: string
): Promise<boolean> => {
  try {
    const objectName = `thinking-box/projects/${projectId}.tar.gz`;

    console.log(`Checking bucket for project ${projectId}...`);

    
    if (!isObjectExist(projectId)){
        return false;
    }

    const response = await client.getObject({
        namespaceName: namespace,
        bucketName,
        objectName,
    });
    
    if (!response.value) {
      throw new Error("Empty bucket response");
    }

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.value as Readable) {
      chunks.push(chunk);
    }
    const tarBuffer = Buffer.concat(chunks);

    console.log(`Downloaded ${tarBuffer.length} bytes `);

    const tempDir = `/tmp/untar_${projectId}`;
    const tarPath = `${tempDir}/project.tar.gz`;

    await sandbox.commands.run(`mkdir -p ${tempDir}`);


    // Converting Buffer to ArrayBuffer
    const arrayBuffer = new Uint8Array(tarBuffer).buffer;
    await sandbox.files.write(tarPath, arrayBuffer);

    // Extract
    await sandbox.commands.run(`mkdir -p /home/user`);
    const extractResult = await sandbox.commands.run(
      `cd /home/user && tar -xzf ${tarPath} 2>&1`,
      {
        onStdout: (data) => console.log("UNTAR:", data),
        onStderr: (data) => console.error("UNTAR stderr:", data)
      }
    );

    if (extractResult.exitCode !== 0) {
      console.error(`Extraction failed with exit code ${extractResult.exitCode}`);
      return false;
    }

    console.log(`Project extracted to /home/user`);

    await sandbox.commands.run(`rm -rf ${tempDir}`);

    return true;

  } catch (error) {
    console.error("Error loading from S3:", error);
    return false;
  }
}