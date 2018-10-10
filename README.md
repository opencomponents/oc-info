oc-info
=======

[![Greenkeeper badge](https://badges.greenkeeper.io/opencomponents/oc-info.svg)](https://greenkeeper.io/)

A cli tool to fetch information from an [OpenComponents](https://github.com/opentable/oc) registry's API.

### Usage

```sh
[sudo] npm i -g oc-info
oc-info <registry url> <command> [--details]
```

Available commands:

* `authors`: shows the list of all the authors for active components
* `dependencies`: shows the list of all the dependencies for active components
* `plugins`: shows the list of all the used plugins by active components

### License

MIT
