# Pull base image.
FROM fedora

# Install.
RUN dnf upgrade
RUN dnf install ruby
RUN gem install bundler

# Add files.
ADD src/ /usr/lib/dump-script

WORKDIR /usr/lib/dump-script

RUN bundle install
RUN whenever --update-crontab

EXPOSE 80
