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
* [x] send text messages
* [x] receive text messages
* [x] send attachment
* [x] download attachments (might change how I do that)
* [ ] get user profile (name and avatar image)
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
* [ ] Graceful shutdown doesn't work. Not geting SIGINT for some reason, even
      though the server *is* PID 1 in the container.
* [ ] Getting error event "Unknown message type" all the time

License
-------

Licensed under the AGPLv3: https://opensource.org/licenses/agpl-3.0
