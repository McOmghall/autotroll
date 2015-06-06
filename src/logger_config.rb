

class LoggerConfig < Logger
  def initialize
    super(STDOUT)
  end
end