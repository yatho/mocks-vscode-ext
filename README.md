# ProxyMocker - Simplify HTTP Request Mocking in VSCode

## Overview

**ProxyMocker** is a powerful Visual Studio Code extension designed to streamline the process of mocking HTTP requests for developers. Whether you're writing unit tests or debugging, **ProxyMocker** captures and saves every HTTP request made during development, allowing you to easily copy request bodies and create precise mocks. Additionally, the extension can intercept requests and return saved mocks directly, bypassing the final server if a mock exists.

## Features

- Intercept and Log HTTP Requests: ProxyMocker acts as a proxy to intercept all HTTP requests made by your application. All intercepted requests are logged and saved within VSCode, giving you easy access to request data.
- Simplify Mocking for Unit Tests: Easily copy the body of any intercepted request. This simplifies the process of creating accurate mock data for unit tests, saving you time and reducing errors.
- Mock Request Responses: ProxyMocker can automatically respond with pre-configured mocks, allowing you to bypass the final server. This feature is perfect for offline development and testing, or when the server is unavailable.
- Customizable Mocking Rules: Define your own rules for mocking requests based on URL patterns, headers, and other request properties - lity with a simple command, so you can switch between live and mock environments effortlessly.

## Installation

1. Open VSCode and go to the Extensions view _(Ctrl+Shift+X or Cmd+Shift+X)_.
2. Search for **proxyMocker**.
3. Click **Install** and follow the instructions.

## Getting started

Once installed, it is necessary to configure the extension via the VSCode settings. For more details, see the extension settings section.

To start capturing your first requests, start a browser with the proxy url and use the command **Proxy Mocker: Save requests**.

To use mocks instead of requests, once they are captured, use the command **Proxy Mocker: Mock requests if existing mock**.

## Commands

1. **Proxy Mocker: Save requests** - Begins saving HTTP requests that match a certain pattern, specified by proxyMocker.pathPattern. The pattern can be configured in the extension settings.
2. **Proxy Mocker: Stop saving requests** - Stops the process of saving requests that was initiated by the "Save requests" command.
3. **Proxy Mocker: Mock requests if existing mock** - Replaces actual HTTP calls with previously saved mock responses if matching mocks exist.
4. **Proxy Mocker: Stop mocking requests** - Disables the mocking of requests, allowing real HTTP requests to be made again.
5. **Proxy Mocker: Refresh mocks** - Refreshes the list of available mock requests shown in the panel.
6. **Proxy Mocker: Remove all mocks** - Deletes all the saved mock requests from the system.

## Extension Settings

This extension offers several customizable settings to configure how the proxy server operates and handle requests.

- `proxyMocker.proxyPort`: Specifies the port on which the proxy server will listen for incoming requests. You can change this to any available port as needed. By default is **8000**.
- `proxyMocker.targetUri`: Defines the uri target of the backend server or service that the proxy server will forward requests to. This is typically the uri where your application is running. By default: **http://localhost:4200**.
- `proxyMocker.automaticallyOpen`: If set to true, the browser will automatically open the proxy URL when the "Mock requests" or "Save requests" mode is activated. This is helpful for quickly testing mocked endpoints.
- `proxyMocker.pathPattern`: Defines the path pattern used to intercept requests. Only requests matching this pattern will be saved or mocked by the extension. You can customize this to match specific API endpoints, for example **/api/v1/**. By default: **/api**.

## Contributing

If you'd like to contribute to **ProxyMocker**, feel free to submit issues or pull requests on the GitHub repository. Contributions are welcome and appreciated!
