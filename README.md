# ProxyMocker - Simplify HTTP Request Mocking in VSCode

## Overview

**ProxyMocker** is a powerful Visual Studio Code extension designed to streamline the process of mocking HTTP requests for developers. Whether you're writing unit tests or debugging, **ProxyMocker** captures and saves every HTTP request made during development, allowing you to easily copy request bodies and create precise mocks. Additionally, the extension can intercept requests and return saved mocks directly, bypassing the final server if a mock exists.

## Features

- Intercept and Log HTTP Requests: ProxyMocker acts as a proxy to intercept all HTTP requests made by your application. All intercepted requests are logged and saved within VSCode, giving you easy access to request data.
- Simplify Mocking for Unit Tests: Easily copy the body of any intercepted request. This simplifies the process of creating accurate mock data for unit tests, saving you time and reducing errors.
- Mock Request Responses: ProxyMocker can automatically respond with pre-configured mocks, allowing you to bypass the final server. This feature is perfect for offline development and testing, or when the server is unavailable.
- Customizable Mocking Rules: Define your own rules for mocking requests based on URL patterns, headers, and other request properties.
- Toggle Proxy On/Off: Enable or disable the proxy and mocking functionality with a simple command, so you can switch between live and mock environments effortlessly.

## Installation

1. Open VSCode and go to the Extensions view _(Ctrl+Shift+X or Cmd+Shift+X)_.
2. Search for **ProxyMocker**.
3. Click **Install** and follow the instructions.

## Getting started

1. Activate ProxyMocker:
   After installation, activate the extension by running the command: ProxyMocker: Start Proxy. This will start intercepting all HTTP requests made by your application.

2. View Logged Requests:
   View intercepted requests in the dedicated ProxyMocker panel within VSCode. Here, you can explore request details, including headers and body content.

3. Copy Request Bodies:
   Select any intercepted request to view its details. Use the Copy Body button to copy the request body to your clipboard, simplifying the process of creating mocks.

4. Create and Manage Mocks:
   Save a request as a mock by clicking the Save as Mock button. Configure the response you want to return when the same request is made in the future. ProxyMocker will then respond with the saved mock whenever the same request is intercepted.

5. Toggle Mocking:
   Use the ProxyMocker: Toggle Mocking command to enable or disable mocking. When mocking is enabled, requests matching your saved mocks will not be sent to the server.

## Commands

<!-- TODO : List all commands -->

-

## Extension Settings

Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

For example:

This extension contributes the following settings:

- `myExtension.enable`: Enable/disable this extension.
- `myExtension.thing`: Set to `blah` to do something.

## Contributing

If you'd like to contribute to **ProxyMocker**, feel free to submit issues or pull requests on the GitHub repository. Contributions are welcome and appreciated!
