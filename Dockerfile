# Pull base image.
FROM fedora

# Install.
RUN dnf --assumeyes upgrade
RUN dnf --assumeyes install @development-tools
RUN dnf --assumeyes install ruby
RUN dnf --assumeyes install gcc
RUN dnf --assumeyes install ruby-devel
RUN dnf --assumeyes install rubygems
RUN dnf --assumeyes install cronie cronie-anacron
RUN dnf --assumeyes install supervisor 
RUN gem install bundler

#Hack to be able to run systemd in user mode
RUN dnf --assumeyes install systemd 
RUN dnf clean all
RUN (cd /lib/systemd/system/sysinit.target.wants/; for i in *; do [ $i == systemd-tmpfiles-setup.service ] || rm -f $i; done)
RUN rm -f /lib/systemd/system/multi-user.target.wants/*
RUN rm -f /etc/systemd/system/*.wants/*
RUN rm -f /lib/systemd/system/local-fs.target.wants/*
RUN rm -f /lib/systemd/system/sockets.target.wants/*udev*
RUN rm -f /lib/systemd/system/sockets.target.wants/*initctl*
RUN rm -f /lib/systemd/system/basic.target.wants/*
RUN rm -f /lib/systemd/system/anaconda.target.wants/

VOLUME [ “/sys/fs/cgroup” ]

COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Add files.
ADD src/ /usr/lib/dump-script

WORKDIR /usr/lib/dump-script

RUN bundle install
RUN whenever --update-crontab

EXPOSE 80


CMD ["/usr/sbin/init"]
