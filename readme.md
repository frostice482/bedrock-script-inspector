<div align="center"> <img src="app/icon.svg" height=100px> </div>

Bedrock Script Inspector is a powerful web-based inspector version of Minecraft Bedrock Script API inspector, providing extended debugging capabiliy for scripts. It utilizes native method wrapping which then will execute the interpreter and web inspector.

Note that this is only usable in Bedrock Dedicated Server and not local-hosted worlds / realms because `@minecraft/server-net` is used to transfer and receive data and `@minecraft/server-admin` is used for autoloading.

## Features

Bedrock Script Inspector includes a lot of features:

+ Script consoles
    + Object inspect
    + Console graphing
+ Eval
+ Events
    + Disable / enable / unsubscribe listeners
    + subscribe / unsubscribe listeners trace
    + Listeners timing
    + Event data inspect
+ Runs
    + Suspend / resume / clear runs
    + Add / clear runs trace
    + Function timing
+ Properties
    + World / entity properties
    + Property set trace
+ Timing
+ Watchdog Stats

## Prerequisites

+ [Node.js](https://nodejs.org/en)
+ [Bedrock Server](https://www.minecraft.net/en-us/download/server/bedrock)

## Setup

1. Download build from Releases & extract

2. Run `install.bat` or `install.sh`

    This will install the server dependencies and link the server CLI commands `bsi` for global use.

3. Add a pack to inspect: (directory must contain manifest.json)

    ```html
    bsi ap <dir/to/pack>
    ```

4. Add the inspector pack to BDS: (directory must contain server.properties)

    ```html
    bsi ab <dir/to/bedrock_server>
    ```

5. Start the BDS server from NodeJS

    ```html
    bsi sb <dir/to/bedrock_server> <port>
    ```

6. Open `localhost` with port depends on which server port is used

## CLI Commands

+ **`add-pack`** (alias `ap`) - Adds a script pack to the inspector pack

    Module dependencies must match the inspector's module dependencies. The pack is added through subpack and dropper script is created to execute the entry script after inspector scripts has been executed.

    + `copy` (`c`) - Copies the pack instead of linking it to the subpack

+ **`remove-pack`** (alias `rp`) - Removes a script pack from the inspector pack

    This removes the pack that is being inspected from the subpack and removes the dropper script.

+ **`add-bds`** (alias `ab`) - Adds the inspector pack to the BDS

    This adds the inspector pack to the BDS behavior packs and its world's behavior packs list. This also creates config for the inspector pack to allow BDS modules to be used.

    + `copy` (`c`) - Copies the inspector pack instead of linking it to the BDS behavios packs

+ **`remove-bds`** (alias `rb`) - Removes the inspector pack from the BDS

    This removes the inspector pack from the BDS behavior packs, its world's behavior packs list and, the inspector pack config.

+ **`start-bds`** (alias `sb`) - Starts server & BDS process from inspector

    This starts the inspector server, while also starts the bedrock server. Benefits being inspector autoconnect is possible and formatted BDS logs.

    + `add` (`a`) - Adds the pack to the BDS (same as running `add-bds`) before starting the BDS
    + `add-copy` (`aC`) - Copies the inspector pack instead of linking it to the BDS behavios packs
    + `remove` (`r`) - Removes the pack from the BDS (same as running `remove-bds`) after BDS process closed
    + `auth-user` (`au`) - Inspector server authorization username
    + `auth-pass` (`ap`) - Inspector server authorization password

    It is possible to start the BDS server without running `add-pack` first by adding `add` option. The `remove` option can also be used to remove the debugger pack after the BDS is closed, making it a temporary addition to the BDS.

    ```
    bsi sb <dir/to/bedrock_server> <port> -a -r
    ```