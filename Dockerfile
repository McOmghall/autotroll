# Pull base image.
FROM ubuntu:14.04

# Install.
RUN yum install ruby
RUN gem install bundler

# Add files.
ADD root/.bashrc /root/.bashrc
ADD root/.gitconfig /root/.gitconfig
ADD root/.scripts /root/.scripts

EXPOSE 80