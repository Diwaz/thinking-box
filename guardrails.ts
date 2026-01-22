export function secureCommand(cmd:string){
    const BLOCKED_COMMANDS = [
    "rm","-rf", "mv", "curl", "wget", "chmod", "chown", ":(){","ls -R"
    ];

    if(BLOCKED_COMMANDS.some(c=>cmd.startsWith(c))){
        throw new Error(`${cmd} command is blocked!`)
    }
}