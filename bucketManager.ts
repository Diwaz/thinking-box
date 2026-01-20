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
import { textSpanOverlapsWith } from "typescript";

// export const makePrefix = (projectId:string)=>{
//     return `projects/${projectId}/TB/`
// }


export const backupDataToBucket= async (sandbox:Sandbox,userId:string,projectId:string)=>{
    let retries = 0;
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
            objectName: `thinking-box/projects/${projectId}`,
            putObjectBody: buffer,
            contentType: 'application/gzip' 
        })
         console.log(`Saved to s3://${bucketName}/${projectId}`);
      await sandbox.commands.run(`rm -rf ${tempDir}`);

      return true;
    }catch(err){
          console.error(`Failed to read TAR file:`, err);
      return false;
    }
    }catch(err){
        console.log("error:",err)
    }

   
}