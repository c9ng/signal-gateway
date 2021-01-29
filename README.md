Signal Gateway
==============

A simple API REST gateway for Signal using `libsignal-service-javascript`.

Run this in your local network and don't make it accessible by the internet.

TODO
----

* [x] docker setup
* [x] basic express js app
* [x] oauth access control
* [x] verify devices
* [ ] send messages
* [ ] receive messages
* [ ] download attachments
* [ ] better errors?
* [ ] tests
* [ ] example client
* [ ] README with basic usage description
* [ ] better logging
  * [ ] request logging
  * [ ] log files with log rotate (i.e. not console.log())
  * [ ] make the above configurable to make it just log to stdout and
        docker/systemd takes care of the log files
* [ ] OpenAPI api documentation
* [ ] add license header to all files
* [ ] maybe publish docker image?

Fix Bugs
--------

* [ ] "V1 session storage migration error: registrationId undefined for open
      session version undefined"

License
-------

Licensed under the AGPLv3: https://opensource.org/licenses/agpl-3.0
